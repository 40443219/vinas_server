const directoryModelFactory = function() {

}

directoryModelFactory.createNewDirectory = (props) => {
    // fixed properties
    const { 
        name: _name, 
        displayName, 
        modifiedTime = null,
        permissions = [
            2,
            1,
            0
        ], 
        parent, 
        root, 
        owner, 
        group,
        mounts = [],
        visible,
    } = props;
    // const type = 'directory';
    const drop_info = [
        null,
        null
    ];

    const target = {
        _name, 
        displayName, 
        modifiedTime, 
        permissions, 
        parent, 
        root, 
        owner,
        group, 
        mounts,
        visible,
        // type,
        drop_info: props.drop_info || drop_info,
        _dirtyList: {
            _name: false, 
            displayName: false, 
            modifiedTime: false, 
            permissions: false, 
            parent: false, 
            root: false, 
            owner: false, 
            group,
            mounts: false,
            visible: false,
            // type: false,
            drop_info: false
        }
    }

    const handler = {
        get: (target, key) => {
            if(key.startsWith('_')) {
                console.error(`Private property ${ key } cannot visit!`);
                return false;
            } else if(key.length > 3 && key.length === 4) {
                if(key.startsWith('get') && `_${ key.slice(3, 4).toLowerCase() }` in target) {
                    return () => target[`_${ key.slice(3, 4).toLowerCase() }`];
                }
            } else if(key.length > 3 && key.length > 4) {
                if(key.startsWith('get') && `_${ key.slice(3, 4).toLowerCase() }${ key.slice(4) }` in target) {
                    return () => target[`_${ key.slice(3, 4).toLowerCase() }${ key.slice(4) }`];
                }
            }

            if(key === 'toJSONString') {
                return () => {
                    return JSON.stringify({
                        name: target['_name'],
                        displayName: target['displayName'], 
                        modifiedTime: target['modifiedTime'], 
                        permissions: target['permissions'], 
                        parent: target['parent'], 
                        root: target['root'], 
                        owner: target['owner'], 
                        group: target['group'],
                        visible: target['visible'],
                        mounts: target['mounts'],
                        // type: target[type],
                        drop_info: target['drop_info']
                    }, null, 2);
                }
            } else if(key === 'toUpdatedJSONString') {
                return () => {

                    const updated = {};

                    for(let [objKey, objValue] of Object.entries(target['_dirtyList'])) {
                        if(objValue === true) {
                            updated[objKey] = target[objKey];
                        }
                    }

                    return JSON.stringify(updated, null, 2);
                }
            }

            return target[key];
        },

        set: (target, key, value) => {
            if(key.startsWith('_')) {
                console.error(`Private property ${ key } cannot be modified!`);
                return false;
            }
            
            if(!(key in target)){
                console.error(`Invalid property ${ key } in directory model!`);
                return false;
            }
            
            target[key] = value;
            target['_dirtyList'][key] = true;
        },

        has: (target, key) => {
            return key.startsWith('_') ? false : (key in target);
        }
    }

    return new Proxy(target, handler);
}


/*
 * Test
 */
// const directory = directoryModelFactory.createNewDirectory({
//     name: "3e8d1c2b-f9f9-4a74-a8af-a4e8bebea438",
//     displayName: "Video",
//     modifiedTime: new Date(),
//     permissions: [ 
//         2.0, 
//         1.0, 
//         0.0
//     ],
//     owner: "testUser",
//     group: [
//        "testUser"
//     ],
//     parent: "b382bd5-becd-4d93-8d3f-98aad78a049e",
//     root: "b382bd5-becd-4d93-8d3f-98aad78a049e",
//     visible: true,
//     drop_info: [ 
//         null, 
//         null
//     ]
// });
// console.log(directory.toJSONString());

module.exports = directoryModelFactory;