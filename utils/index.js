const mongo  = require('../db/mongodb');
const DirectoryModelFactory = require('../models/directory');
const FileModelFactory = require('../models/file');

const createGUID = () => {
    let d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const searchUserByGUID = async (id) => {
    try {
        const users = await mongo.findFromCollection('user', { 'name': id });
        
        if(users.length === 1) {
            return users[0];
        }
    } catch (err) {
        console.error(err);
    }

    return null;
}

const searchGroupByGUID = async (id) => {
    try {
        const users = await mongo.findFromCollection('user', { 'name': id });

        if(users.length === 1) {
            return {
                name: users[0].name,
                displayName: users[0].username
            };
        }

        const groups = await mongo.findFromCollection('roleMap', { 'name': id });
        
        if(groups.length === 1) {
            return {
                name: groups[0].name,
                displayName: groups[0].displayName
            };
        }
    } catch (err) {
        console.error(err);
    }

    return null;
}

const buildDirTree = async (source, userInfo = null) => {
    let _node = source;
    let _nodeParents = [];
    while(_node.parent !== null) {
        const _nodeDir = (await mongo.findFromCollection('directories', { "name": _node.parent, "visible": true }))[0];
        // console.log(_nodeDir)
        let owner = userInfo ? userInfo.displayName : '';
        let group = userInfo ? userInfo.displayName : '';
        if(userInfo && _nodeDir.owner !== userInfo.name) {
            owner = (await searchUserByGUID(userInfo.name)).displayName || null;
        }
        if(userInfo && _nodeDir.group !== userInfo.name) {
            group = (await searchGroupByGUID(userInfo.name)).displayName || null;
        }

        if(userInfo) {
            _nodeParents.unshift(
                {
                    name: _nodeDir.name,
                    displayName: _nodeDir.displayName,
                    owner,
                    group,
                    type: 'directory'
                }
            );
        } else {
            // _nodeParents.unshift(
            //     {
            //         name: _nodeDir.name,
            //         displayName: _nodeDir.displayName,
            //         type: 'directory'
            //     }
            // );

            _nodeParents.unshift(_nodeDir);
        }
        
        _node = _nodeDir;
    }

    return _nodeParents;
}

const buildPathFromDirTree = (arr, splitter = '/') => {
    const namePaths = [];
    const displayNamePaths = [];
    arr.forEach(item => {
        namePaths.push(item.name);
        displayNamePaths.push(item.displayName);
    });

    return {
        path: namePaths.join(splitter),
        displayPath: displayNamePaths.join(splitter)
    }
}

const rebuildDirs = async (arr) => {
    let inserted = 0;
    for([ idx, item ] of arr.entries()) {
        let r = await mongo.findFromCollection('directories', { 'name': item.name });
        if(r.length === 0) {
            const directoryModel = DirectoryModelFactory.createNewDirectory(item);
            r = await mongo.insertToCollection('directories', [ JSON.parse(directoryModel.toJSONString()) ]);
            if(r.insertedCount === 1) {
                inserted++;
            }
        }
    }

    if(inserted === arr.length) {
        return true;
    }

    return false;
}

const validateDirsExists = async (arr, restore = false) => {
    const invalidDirs = [];

    for(const item of arr) {
        let r = await mongo.findFromCollection('directories', { 'name': item.name });
        // console.log(r);
        if(r.length === 0) {
            invalidDirs.push(item);
        } else {
            if(restore) {
                // console.log(item.name);
                r = await mongo.updateFromCollection('directories', { 
                    findOptions: { 'name': item.name },
                    setOptions: {
                        'visible': true,
                        // 'drop_info': [
                        //     null,
                        //     null
                        // ]
                    }
                }, true);
            }
            if(!(r.matchedCount || r.modifiedCount)) {
                invalidDirs.push(item);
            }
        }
    }

    return invalidDirs;
}

const matchObjectByGUID = async (id) => {
    try {
        let result = await mongo.findFromCollection('files', { 'name': id });
        if(!result.length) {
            result = await mongo.findFromCollection('directories', { 'name': id });
            if(!result.length) {
                return null;
            }
        }

        return result[0];
    } catch(err) {
        console.error(err);
    }
}

const matchRoleByGUID = async (id) => {
    try {
        let result = await mongo.findFromCollection('user', { 'name': id });
        if(!result.length) {
            result = await mongo.findFromCollection('roleMap', { 'name': id});
            if(!result.length) {
                return null;
            }
        }

        return { name, displayName, username = null } = result[0];
    } catch(err) {
        console.error(err);
    }
}

const matchGroupByObject = async (object) => {
    // Directory object already has group property
    if(object.group) return object.group;

    let result = await mongo.findFromCollection('directories', { 'name': object.parent });
    if(result.length === 1) {
        return result[0].group;
    }

    return null;
}

module.exports = {
    createGUID,
    searchUserByGUID,
    searchGroupByGUID,
    buildDirTree,
    buildPathFromDirTree,
    rebuildDirs,
    validateDirsExists,
    matchObjectByGUID,
    matchRoleByGUID,
    matchGroupByObject
} 