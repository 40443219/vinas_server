require('dotenv').config();
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const mongo = require('../db/mongodb');
const fs = require('fs');
const path = require('path');
const inspect = require('util').inspect;
const Busboy = require('busboy');
const Mime = require('mime-types');
const utils = require('../utils');
const Permission = require('../permissions');
const DirectoryModelFactory = require('../models/directory');
const FileModelFactory = require('../models/file');

const fileStorePath = process.env.FILESTORE_PATH_DEFAULT;

router.prefix('/api/user');

router.post('/files', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);

    // Todo: Permission check -> File and Directory foreach(unfinish)

    try {
        // For performance
        const ownerNames = new Set();
        if(!reqData.name) {
            const rootDir = (await mongo.findFromCollection('directories', { "owner": userInfo.name, "parent": null, "visible": true }))[0];
            // console.log(rootDir);
            let owner = userInfo.displayName;
            let group = userInfo.displayName;
            if(rootDir.owner !== userInfo.name) {
                owner = (await utils.searchUserByGUID(rootDir.name)).displayName || null;
            }
            if(rootDir.group !== userInfo.name) {
                group = (await utils.searchGroupByGUID(rootDir.name)).displayName || null;
            }
            const rootContent = {
                dirs: await mongo.findFromCollection('directories', { "parent": rootDir.name, "visible": true }),
                files: await mongo.findFromCollection('files', { "parent": rootDir.name, "visible": true })
            };

            // Async function not working in Array.forEach
            //  rootContent.dirs.forEach(async (item, idx, arr) => {
            //     let owner = userInfo.displayName;
            //     let group = userInfo.displayName;
            //     if(item.owner !== userInfo.name) {
            //         owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
            //     }
            //     if(item.group !== userInfo.name) {
            //         group = (await utils.searchGroupByGUID(userInfo.name)).displayName || null;
            //     }
            //     arr[idx] = {
            //         name: item.name,
            //         displayName: item.displayName,
            //         modifiedTime: item.modifiedTime,
            //         owner,
            //         group,
            //         type: 'directory'
            //     };
            // });

            for(const [ idx, item ] of rootContent.dirs.entries()) {
                let owner = userInfo.displayName;
                let group = userInfo.displayName;
                if(item.owner !== userInfo.name) {
                    owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                }
                if(item.group !== userInfo.name) {
                    group = (await utils.searchGroupByGUID(userInfo.name)).displayName || null;
                }
                
                // rootContent.dirs[idx] = {
                //     name: item.name,
                //     displayName: item.displayName,
                //     modifiedTime: item.modifiedTime,
                //     owner,
                //     group,
                //     type: 'directory'
                // };

                if(await Permission.unsafe_validate(item, accessToken)) {
                    console.log(`Directory ${ item.displayName }(${ item.name }) auth passed!`);
                    rootContent.dirs[idx] = {
                        name: item.name,
                        displayName: item.displayName,
                        modifiedTime: item.modifiedTime,
                        owner,
                        group,
                        type: 'directory'
                    };
                } else {
                    console.log(`Directory ${ item.displayName }(${ item.name }) auth not passed!`);
                    rootContent.dirs.splice(idx, 1);
                }
            }

            // Async function not working in Array.forEach
            // rootContent.files.forEach(async (item, idx, arr) => {
            //     let owner = userInfo.displayName;
            //     if(item.owner !== userInfo.name) {
            //         owner = await utils.searchUserByGUID(userInfo.name);
            //     }
            //     arr[idx] = {
            //         name: item.name,
            //         displayName: item.displayName,
            //         modifiedTime: item.modifiedTime,
            //         size: item.size,
            //         owner,
            //         group,
            //         type: 'file'
            //     };
            // });

            for(const [ idx, item ] of rootContent.files.entries()) {
                let owner = userInfo.displayName;
                if(item.owner !== userInfo.name) {
                    owner = await utils.searchUserByGUID(userInfo.name);
                }
                // rootContent.files[idx] = {
                //     name: item.name,
                //     displayName: item.displayName,
                //     modifiedTime: item.modifiedTime,
                //     size: item.size,
                //     owner,
                //     group,
                //     type: 'file'
                // };

                if(await Permission.unsafe_validate(item, accessToken)) {
                    console.log(`File ${ item.displayName }(${ item.name }) auth passed!`);
                    rootContent.files[idx] = {
                        name: item.name,
                        displayName: item.displayName,
                        modifiedTime: item.modifiedTime,
                        size: item.size,
                        owner,
                        group,
                        type: 'file'
                    };
                } else {
                    console.log(`File ${ item.displayName }(${ item.name }) auth not passed!`);
                    rootContent.files.splice(idx, 1);
                }
            }

            
            const returnDir = {
                name: rootDir.name,
                displayName: rootDir.displayName,
                owner,
                group,
                root: rootDir.name,
                type: 'directory',
                parent: null,
                parents: [],
                children: [
                    ...rootContent.dirs,
                    ...rootContent.files
                ]
            }
            // console.log(returnDir);

            ctx.body = returnDir;
        } else {
            const matchDirs = await mongo.findFromCollection('directories', { "name": reqData.name, "visible": true });
            if(matchDirs.length === 1) {
                const matchDir = matchDirs[0];

                let owner = userInfo.displayName;
                let group = userInfo.displayName;
                if(matchDir.owner !== userInfo.name) {
                    owner = (await utils.searchUserByGUID(matchDir.name)).displayName || null;
                }
                if(matchDir.group !== userInfo.name) {
                    group = (await utils.searchGroupByGUID(matchDir.name)).displayName || null;
                }

                const dirContent = {
                    dirs: await mongo.findFromCollection('directories', { "parent": matchDir.name, "visible": true }),
                    files: await mongo.findFromCollection('files', { "parent": matchDir.name, "visible": true })
                };

                // Async function not working in Array.forEach
                // dirContent.dirs.forEach(async (item, idx, arr) => {
                //     let owner = userInfo.displayName;
                //     let group = userInfo.displayName;
                //     if(item.owner !== userInfo.name) {
                //         owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                //     }
                //     if(item.group !== userInfo.name) {
                //         group = (await utils.searchGroupByGUID(userInfo.name)).displayName || null;
                //     }
                //     arr[idx] = {
                //         name: item.name,
                //         displayName: item.displayName,
                //         modifiedTime: item.modifiedTime,
                //         owner,
                //         group,
                //         type: 'directory'
                //     };
                // });

                for(const [ idx, item ] of dirContent.dirs.entries()) {
                    let owner = userInfo.displayName;
                    let group = userInfo.displayName;
                    if(item.owner !== userInfo.name) {
                        owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                    }
                    if(item.group !== userInfo.name) {
                        group = (await utils.searchGroupByGUID(userInfo.name)).displayName || null;
                    }
                    // dirContent.dirs[idx] = {
                    //     name: item.name,
                    //     displayName: item.displayName,
                    //     modifiedTime: item.modifiedTime,
                    //     owner,
                    //     group,
                    //     type: 'directory'
                    // };

                    if(await Permission.unsafe_validate(item, accessToken)) {
                        console.log(`Directory ${ item.displayName }(${ item.name }) auth passed!`);
                        dirContent.dirs[idx] = {
                            name: item.name,
                            displayName: item.displayName,
                            modifiedTime: item.modifiedTime,
                            owner,
                            group,
                            type: 'directory'
                        };
                    } else {
                        console.log(`Directory ${ item.displayName }(${ item.name }) auth not passed!`);
                        dirContent.dirs.splice(idx, 1);
                    }
                }

                // Async function not working in Array.forEach
                // dirContent.files.forEach(async (item, idx, arr) => {
                //     let owner = userInfo.displayName;
                //     if(item.owner !== userInfo.name) {
                //         owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                //     }
                //     arr[idx] = {
                //         name: item.name,
                //         displayName: item.displayName,
                //         modifiedTime: item.modifiedTime,
                //         size: item.size,
                //         owner,
                //         group,
                //         type: 'file'
                //     };
                // });

                for(const [ idx, item ] of dirContent.files.entries()) {
                    let owner = userInfo.displayName;
                    if(item.owner !== userInfo.name) {
                        owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                    }
                    // dirContent.files[idx] = {
                    //     name: item.name,
                    //     displayName: item.displayName,
                    //     modifiedTime: item.modifiedTime,
                    //     size: item.size,
                    //     owner,
                    //     group,
                    //     type: 'file'
                    // };

                    if(await Permission.unsafe_validate(item, accessToken)) {
                        console.log(`File ${ item.displayName }(${ item.name }) auth passed!`);
                        dirContent.files[idx] = {
                            name: item.name,
                            displayName: item.displayName,
                            modifiedTime: item.modifiedTime,
                            size: item.size,
                            owner,
                            group,
                            type: 'file'
                        };
                    } else {
                        console.log(`File ${ item.displayName }(${ item.name }) auth not passed!`);
                        dirContent.files.splice(idx, 1);
                    }
                }

                let _node = matchDir;
                let _nodeParents = [];
                while(_node.parent !== null) {
                    const _nodeDir = (await mongo.findFromCollection('directories', { "name": _node.parent, "visible": true }))[0];
                    // console.log(_nodeDir)
                    let owner = userInfo.displayName;
                    let group = userInfo.displayName;
                    if(_nodeDir.owner !== userInfo.name) {
                        owner = (await utils.searchUserByGUID(userInfo.name)).displayName || null;
                    }
                    if(_nodeDir.group !== userInfo.name) {
                        group = (await utils.searchGroupByGUID(userInfo.name)).displayName || null;
                    }
                    _nodeParents.unshift(
                        {
                            name: _nodeDir.name,
                            displayName: _nodeDir.displayName,
                            owner,
                            group,
                            type: 'directory'
                        }
                    );
                    _node = _nodeDir;
                }
                // console.log(_nodeParents)
        
                const returnDir = {
                    name: matchDir.name,
                    displayName: matchDir.displayName,
                    owner,
                    group,
                    root: matchDir.root,
                    type: 'directory',
                    parent: matchDir.parent,
                    parents: _nodeParents,
                    children: [
                        ...dirContent.dirs,
                        ...dirContent.files
                    ],
                }
                // console.log(returnDir);

                return ctx.body = returnDir;
            }
        }
    } catch(err) {
        console.error(err);
        return ctx.body = null;
    }
});

router.post('/createNewFolder', async(ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const parentDir = reqData.parentDir;
    const targetDisplayName = reqData.value;

    // Todo: permission check -> parent directory write permission check(unsafe)

    const response = {
        errorno: -1,
        msg: "Create new directory failed!"
    }
    if(parentDir && targetDisplayName) {
        const parentObject = (await mongo.findFromCollection('directories', { 'name': parentDir.name }))[0];
        if(await Permission.unsafe_validate(parentObject, accessToken, 2)) {
            const targetName = utils.createGUID();
            console.log(`Directory ${ parentDir.displayName }(${ parentDir.name }) has write permission, creating new directory: ${ targetDisplayName }(${ targetName })!`);
            const dirModel = DirectoryModelFactory.createNewDirectory(
                {
                    name: targetName, 
                    displayName: targetDisplayName, 
                    modifiedTime: new Date(),
                    parent: parentDir.name, 
                    root: parentDir.root, 
                    owner: userInfo.name, 
                    group: userInfo.name,
                    visible: true
                }
            )
            // console.log(dirModel.toJSONString());
    
            const result = await mongo.insertToCollection('directories', [ JSON.parse(dirModel.toJSONString()) ]);
            if(result.insertedCount === 1) {
                response.errorno = 0;
                response.msg = 'Create new Directory success!';
            }
        } else {
            console.log(`No modify permission in directory ${ parentDir.displayName }(${ parentDir.name })!`);
            response.errorno = 1;
            response.msg = `No modify permission in folder ${ parentDir.displayName }!`;
        }

        ctx.body = response;
    }
});

router.post('/upload', async (ctx) => {
    // console.log(JSON.stringify(ctx.request, null, 2));
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);

    const response = {
        errorno: -1,
        msg: 'Upload failed!',
        // formData: {}
    }

    let uploadPath = null;
    let uploadRoot = null;
    if(!ctx.request.headers['path'] || !userInfo) {
        ctx.status = 400;
        // ctx.body = 'Invalid path';
        response.errorno = 1;
        response.msg = 'Invalid path!';
        return ctx.body = response;
    } else {
        uploadPath = ctx.request.headers['path'];

        // Todo: check parent path is exist -> done
        const matchDirs = await mongo.findFromCollection('directories', { 'name': uploadPath });
        if(matchDirs.length === 1) {
            uploadRoot = matchDirs[0].root;
        } else {
            ctx.status = 400;
            // ctx.body = 'Invalid path';
            response.errorno = 1;
            response.msg = 'Invalid path!';
            return ctx.body = response;
        }

        // Todo: permission check -> upload path check(unsafe)
        console.log(`uploadPath: ${ uploadPath }`);

        if(!(await Permission.unsafe_validate(matchDirs[0], accessToken, 2))) {
            console.log(`Directory ${ matchDirs[0].displayName }(${ matchDirs[0].name }) no modify permission!`);
            ctx.status = 401;
            response.errorno = 2;
            response.msg = `Directory ${ matchDirs[0].displayName } no modify permission!`;
            return ctx.body = response;
        } else {
            console.log(`Directory ${ matchDirs[0].displayName }(${ matchDirs[0].name }) has write permission!`);
        }
    }
    
    const req = ctx.req;
    let busboy = new Busboy({ headers: req.headers });

    // let filePath = path.join(__dirname, '../files');
    let filePath = path.join(__dirname, '../', fileStorePath);
    let fileList = [];

    return new Promise((resolve, reject) => {

        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            let fileName = utils.createGUID();
            let _uploadFilePath = path.join(filePath, fileName);
            let saveTo = path.join(_uploadFilePath);
        
            file.pipe(fs.createWriteStream(saveTo));
        
            file.on('end', () => {
                response.success = true;
                response.msg = 'Upload success!';
        
                fileList.push({
                    name: fileName,
                    displayName: filename,
                    mime: Mime.lookup(filename),
                    size: fs.statSync(saveTo).size
                })
                console.log(`Upload success, filename: ${ fileName }`);
            });
        });

        busboy.on('error', function (err) {
            console.log(err);

            reject(err);
        });

        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            // console.log(`field[' + ${ fieldname } + ']: value:  + ${ inspect(val) }`);
            // response.formData[fieldname] = inspect(val);
        });

        busboy.on('finish', async function() {
            // console.log(response.formData);
            console.log(JSON.stringify(fileList, null, 2));

            try {
                const file = fileList[0];
                // const response = await mongo.insertToCollection('files', [{
                //     name: file.name,
                //     displayName: file.displayName,
                //     modifiedTime: new Date(),
                //     // .mp3 -> audio/mp3(wrong)
                //     // mime: file.mime,
                //     // .mp3 -> auido/mpeg(correct)
                //     mime: Mime.lookup(file),
                //     size: file.size,
                //     permissions: [ 
                //         2.0, 
                //         1.0, 
                //         0.0
                //     ],
                //     owner: userInfo.name,
                //     parent: uploadPath,
                //     root: uploadRoot,
                //     visible: true,
                //     drop_info: [
                //         null,
                //         null
                //     ]
                // }]);

                const fileModel = FileModelFactory.createNewFile({
                    name: file.name,
                    displayName: file.displayName,
                    modifiedTime: new Date(),
                    // .mp3 -> audio/mp3(wrong)
                    // mime: file.mime,
                    // .mp3 -> auido/mpeg(correct)
                    mime: file.mime,
                    size: file.size,
                    permissions: [ 
                        2.0, 
                        1.0, 
                        0.0
                    ],
                    owner: userInfo.name,
                    parent: uploadPath,
                    root: uploadRoot,
                    visible: true,
                    drop_info: [
                        null,
                        null
                    ]
                });

                const result = await mongo.insertToCollection('files', [
                    JSON.parse(fileModel.toJSONString())
                ]);

                if(result.insertedCount === 1){
                    resolve(result);
                } else {
                    reject(result);
                }  
            } catch(err) {
                console.error(err);
            }
            
        })

        req.pipe(busboy);
        
    })
    .then((res) => {
        response.errorno = 0;
        response.msg = 'Upload success!';
        ctx.body = response;
    })
    .catch((err) => {
        console.error(err);
        ctx.body = response;
    });
});

router.get('/getFile', async (ctx) => {
    const reqData = ctx.request.query;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const fileID = reqData.objectID;

    if(fileID) {
        const matchFiles = await mongo.findFromCollection('files', { "name": fileID });
        // console.log(matchFiles);
        if(matchFiles.length === 1 ) {
            // Todo: Permission check -> Object read permission check(unsafe)

            const matchFile = matchFiles[0];

            if(!(await Permission.unsafe_validate(matchFile, accessToken))) {
                ctx.status = 401;
                return ctx.body = 'Unauthorized!';
            }

            // const filePath = path.join(__dirname, `../files/${ matchFile.name }`);
            const filePath = path.join(__dirname, '../', `${ fileStorePath }/${ matchFile.name }`);
            const fileStream = fs.createReadStream(filePath);
            ctx.set({
                'Content-Type': 'application/octet-stream',  
                'Content-Disposition': `attachment; filename=${matchFile.displayName}`,
            });
            ctx.body = fileStream;
        }
    }
});

router.post('/restore', async (ctx) =>{
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const objectList = reqData.objectList;

    console.log(objectList);

    const response = {
        errorno: -1,
        msg: 'Resotre failed!',
        errorList: []
    }

    if(objectList.length > 0) {
        // Todo: Permission check -> check permission of object's parent(unsafe)

        let dir = null;
        let updatedCount = 0;
        let restoredCount = 0;
        for(objectID of objectList) {
            const matchFiles = await mongo.findFromCollection('files', { 'name': objectID });

            if(matchFiles.length === 1) {
                const matchFile = matchFiles[0];

                // console.log(matchFile.drop_info[0]);
                
                const invalidDirs = await utils.validateDirsExists(matchFile.drop_info[0], true);

                // console.log(`invalidDirs: ${ JSON.stringify(invalidDirs, null, 2) }`);
                if(invalidDirs.length > 0) {
                    console.log('Need rebuild');
                    const rebuildResult = await utils.rebuildDirs(invalidDirs);

                    if(!rebuildResult) {
                        return ctx.body = response;
                    }
                }

                const parentDir = (await mongo.findFromCollection('directories', { 'name': matchFile.parent }))[0];
                if(!(await Permission.unsafe_validate(parentDir, accessToken, 2))) {
                    console.log(`File ${ matchFile.displayName }(${ matchFile.name })'s parent: ${ parentDir.displayName }(${ parentDir.name }) no modify permission!`);
                    response.errorList.push(objectID);
                    continue;
                }
                console.log(`File ${ matchFile.displayName }(${ matchFile.name })'s parent: ${ parentDir.displayName }(${ parentDir.name }) has modify permission!`);

                const updatedFile = await mongo.updateFromCollection('files', { 
                    findOptions: { 'name': matchFile.name },
                    setOptions: {
                        'visible': true,
                        'drop_info': [
                            null,
                            null
                        ]
                    }
                });

                if(updatedFile.matchedCount || updatedFile.modifiedCount) {
                    updatedCount++;
                    restoredCount++;
                }
            } else {
                const matchDirs = await mongo.findFromCollection('directories', { 'name': objectID });
                if(matchDirs.length === 1) {
                    dir = matchDirs[0];

                    if(!(await Permission.unsafe_validate(dir, accessToken, 2))) {
                        console.log(`Directory ${ dir.displayName }(${ dir.name }) no modify permission!`);
                        response.errorList.push(objectID);
                        continue;
                    }

                    const invalidDirs = await utils.validateDirsExists(dir.drop_info[0], true);

                    // console.log(`invalidDirs: ${ JSON.stringify(invalidDirs, null, 2) }`);
                    if(invalidDirs.length > 0) {
                        console.log('Need rebuild');
                        const rebuildResult = await utils.rebuildDirs(invalidDirs);

                        if(!rebuildResult) {
                            return ctx.body = response;
                        }
                    }

                    const parentDir = (await mongo.findFromCollection('directories', { 'name': dir.parent }))[0];
                    if(!(await Permission.unsafe_validate(parentDir, accessToken, 2))) {
                        console.log(`Directory ${ dir.displayName }(${ dir.name })'s parent: ${ parentDir.displayName }(${ parentDir.name }) no modify permission!`);
                        errorList.push(objectID);
                        continue;
                    }
                    console.log(`Directory ${ dir.displayName }(${ dir.name })'s parent: ${ parentDir.displayName }(${ parentDir.name }) no modify permission!`);

                    const updatedFiles = await mongo.updateFromCollection('files', { 
                        findOptions: { 'parent': dir.name, 'drop_info.1': { $eq: new Date(dir.drop_info[1]) } },
                        setOptions: {
                            'visible': true,
                            'drop_info': [
                                null,
                                null
                            ]
                        }
                    }, true);
                    if(updatedFiles.matchedCount || updatedFiles.modifiedCount) {
                        updatedCount += (updatedFiles.matchedCount > updatedFiles.modifiedCount) ? updatedFiles.matchedCount : updatedFiles.modifiedCount;
                    }

                    const updatedDir = await mongo.updateFromCollection('directories', { 
                        findOptions: { 'name': dir.name },
                        setOptions: {
                            'visible': true,
                            'drop_info': [
                                null,
                                null
                            ]
                        }
                    });
        
                    if(updatedDir.matchedCount || updatedDir.modifiedCount) {
                        updatedCount++;
                        restoredCount++;
                    }
                }
            }
        }

        if(restoredCount === objectList.length) {
            response.errorno = 0;
            response.msg = 'Drop success!';
            response.restoredCount = restoredCount;
            response.updatedCount = updatedCount;

            return ctx.body = response;
        } else {
            return ctx.body = response;
        }
    }
});

router.post('/drop', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const objectList = reqData.objectList;

    // console.log(objectList);

    const response = {
        errorno: -1,
        msg: 'Drop failed!',
        errorList: []
    }

    if(objectList.length > 0) {
        // Todo: Permission check -> Object permission check foreach(unfinish)

        let dir = null;
        let updatedCount = 0;
        let droppedCount = 0;
        for(objectID of objectList) {
            const matchFiles = await mongo.findFromCollection('files', { 'name': objectID });

            if(matchFiles.length === 1) {
                const matchFile = matchFiles[0];

                if(!await Permission.unsafe_validate(matchFile, accessToken, 2)) {
                    response.errorList.push(objectID);
                    console.log(`File ${ matchFile.displayName }(${ matchFile.name }) no modify permission!`);
                    continue;
                }
                console.log(`File ${ matchFile.displayName }(${ matchFile.name }) has modify permission!`);

                const dirTree = await utils.buildDirTree(matchFile);
                // const dirPath = utils.buildPathFromDirTree(dirTree);

                const updatedFile = await mongo.updateFromCollection('files', { 
                    findOptions: { 'name': matchFile.name },
                    setOptions: {
                        'visible': false,
                        'drop_info': [
                            dirTree,
                            new Date()
                        ]
                    }
                });

                if(updatedFile.matchedCount || updatedFile.modifiedCount) {
                    updatedCount++;
                    droppedCount++;
                }
            } else {
                const matchDirs = await mongo.findFromCollection('directories', { 'name': objectID });
                if(matchDirs.length === 1) {
                    dir = matchDirs[0];

                    if(!(await Permission.unsafe_validate(dir, accessToken, 2))) {
                        response.errorList.push(objectID);
                        console.log(`Directory ${ dir.displayName }(${ dir.name }) no modify permission!`);
                        continue;
                    }

                    const dirTree = await utils.buildDirTree(dir);
                    const fDirTree = Array.from(dirTree)
                    fDirTree.push(dir);
                    // const dirPath = utils.buildPathFromDirTree(dirTree);

                    const modifiedTime = new Date();

                    // Drop all files in directory
                    // const updatedFiles = await mongo.updateFromCollection('files', { 
                    //     findOptions: { 'parent': dir.name },
                    //     setOptions: {
                    //         'visible': false,
                    //         'drop_info': [
                    //             dirTree,
                    //             modifiedTime
                    //         ]
                    //     }
                    // }, true);

                    // Only hide files in directory
                    // const updatedFiles = await mongo.updateFromCollection('files', { 
                    //     findOptions: { 'parent': dir.name },
                    //     setOptions: {
                    //         'visible': false,
                    //     }
                    // }, true);

                    const updatedFiles = await mongo.updateFromCollection('files', { 
                        findOptions: { 'parent': dir.name, 'drop_info.1': { $eq: null } },
                        setOptions: {
                            'visible': false,
                            'drop_info': [
                                fDirTree,
                                modifiedTime
                            ]
                        }
                    }, true);

                    if(updatedFiles.matchedCount || updatedFiles.modifiedCount) {
                        updatedCount += (updatedFiles.matchedCount > updatedFiles.modifiedCount) ? updatedFiles.matchedCount : updatedFiles.modifiedCount;
                    }

                    const updatedDir = await mongo.updateFromCollection('directories', { 
                        findOptions: { 'name': dir.name },
                        setOptions: {
                            'visible': false,
                            'drop_info': [
                                dirTree,
                                modifiedTime
                            ]
                        }
                    });
        
                    if(updatedDir.matchedCount || updatedDir.modifiedCount) {
                        updatedCount++;
                        droppedCount++;
                    }
                }
            }
        }

        if(droppedCount === objectList.length) {
            if(response.errorList.length > 0) {
                ctx.status = 409;
            }
            response.errorno = 0;
            response.msg = 'Drop success!';
            response.droppedCount = droppedCount;
            response.updatedCount = updatedCount;

            ctx.body = response;
        } else {
            ctx.body = response;
        }
    }
});

router.post('/delete', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);;
    const objectList = reqData.objectList;

    const response = {
        errorno: -1,
        msg: 'Delete failed!',
        errorList: []
    }

    if(objectList) {
        // Todo: Permission check -> Object check permission foreach(unfinish)

        for(const objectID of objectList) {
            console.log(objectID);
            const matchFiles = await mongo.findFromCollection('files', { 'name': objectID });

            if(matchFiles.length === 1) {
                const matchFile = matchFiles[0];

                if(!(await Permission.unsafe_validate(matchFile, accessToken))) {
                    response.errorList.push(objectID);
                    console.log(`File ${ matchFile.displayName }(${ matchFile.name }) no modify permission!`);
                    continue;
                }
                console.log(`File ${ matchFile.displayName }(${ matchFile.name }) has modify permission!`);

                const result = await mongo.deleteFromCollection('files', { 'name': matchFile.name });
                if(result.deletedCount === 1) {
                    const filePath = path.join(__dirname, '../', `${ fileStorePath }/${ matchFile.name }`);
                    let isExists = true;
                    try {
                        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
                        console.log('can read/write');
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error('no access!');
                        isExists = false;
                    }
                    if(isExists) {
                        response.errorno = 0;
                        response.msg = `Delete file: ${ matchFile.displayName }(${ matchFile.name }) success!`;
                    } else {
                        response.errorno = 1;
                        response.msg = `Delete file: ${ matchFile.displayName }(${ matchFile.name }) failed!`;
                    }
                } else {
                    response.errorno = -1;
                    response.msg = `Delete file: ${ matchFile.displayName }(${ matchFile.name }) failed!`;
                }
            } else {
                const matchDirs = await mongo.findFromCollection('directories', { 'name': objectID });

                if(matchDirs.length === 1) {
                    const matchDir = matchDirs[0];

                    if(!(await Permission.unsafe_validate(matchDir, accessToken))) {
                        response.errorList.push(objectID);
                        console.log(`Directory ${ matchDir.displayName }(${ matchDir.name }) no modify permission!`);
                        continue;
                    }

                    const files = await mongo.findFromCollection('files', { 'parent': objectID, 'drop_info': { $ne: null }, 'drop_info.1': { $eq: new Date(matchDir.drop_info[1]) } });
                    const fResult = await mongo.deleteFromCollection('files', { 'parent': objectID, 'drop_info': { $ne: null }, 'drop_info.1': { $eq: new Date(matchDir.drop_info[1]) } }, true);
                    
                    for(const file of files) {
                        const filePath = path.join(__dirname, '../', `${ fileStorePath }/${ file.name }`);
                        try {
                            fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
                            console.log('can read/write');
                            fs.unlinkSync(filePath);
                        } catch (err) {
                            console.error('no access!');
                        }
                    }

                    let dResult = null;
                    if(matchDir.visible === true) {
                        dResult = await mongo.updateFromCollection('directories', 
                            {
                                findOptions: { 'name': objectID },
                                setOptions: { 'drop_info': [ null, null ] }
                            }, false);
                        if(dResult.updatedCount === 1) {
                            response.errorno = 0;
                            response.msg = `Delete directory: ${ matchDir.displayName }(${ matchDir.name }) success! files deleted: ${ fResult.deletedCount }.`;
                        } else {
                            response.errorno = 1;
                        }
                    } else {
                        dResult = await mongo.deleteFromCollection('directories', { 'name': objectID });
                        if(dResult.deletedCount === 1) {
                            response.errorno = 0;
                            response.msg = `Delete directory: ${ matchDir.displayName }(${ matchDir.name }) success! files deleted: ${ fResult.deletedCount }.`;
                        } else {
                            response.errorno = 1;
                        }
                    }

                }
            }
        }
        
    }

    if(response.errorList.length > 0) {
        ctx.status = 409;
    }
    return ctx.body = response;
});

router.post('/moveTo', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);

    // Todo: permission check -> dest and object permisson permission check

    // console.log(JSON.stringify(reqData, null , 2));
    const objectList = reqData.objectList;
    const dest = reqData.destination;
    const oldFiles = [];
    const oldDirectories = [];
    const sourceDirList = new Set();
    const response = {
        errorno: -1,
        msg: 'Move operation failed!',
        errorList: []
    };

    const destObjectMatcher = await mongo.findFromCollection('directories', { 'name': dest });
    if(destObjectMatcher.length !== 1) {
        console.log(`Move operation failed!, destination directory (${ dest }) not exist!`);
        response.errorno = 1;
        response.msg = `Move operation failed!, destination folder (${ dest }) not exist!`;
    } else {
        const destObject = destObjectMatcher[0];

        if(!(await Permission.unsafe_validate(destObject, accessToken, 2))) {
            console.log(`Destination directory ${ destObject.displayName }(${ destObject.name }) no modify permission!`);
            response.errorno = 2;
            response.msg = `Destination folder ${ destObject.displayName }(${ destObject.name })  no modify permission!`;
            return ctx.body = response;
        }
        console.log(`Destination directory ${ destObject.displayName }(${ destObject.name })  has modify permission!`);

        for(objectID of objectList) {
            const matchFiles = await mongo.findFromCollection('files', { 'name': objectID });
            if(matchFiles.length === 1) {
                const matchFile = matchFiles[0];

                if(!(await Permission.unsafe_validate(matchFile, accessToken, 2))) {
                    console.log(`File ${ matchFile.displayName }(${ matchFile.name }) no modify permission!`);
                    response.errorList.push(objectID);
                    continue;
                }
                console.log(`File ${ matchFile.displayName }(${ matchFile.name })  has modify permission!`);

                const fileModel = FileModelFactory.createNewFile(matchFile);
                sourceDirList.add(fileModel.parent);
                oldFiles.push(fileModel);
            } else {
                const matchDirs = await mongo.findFromCollection('directories', { 'name': objectID });
                if(matchDirs.length === 1) {
                    const matchDir = matchDirs[0];
                    if(!(await Permission.unsafe_validate(matchDir, accessToken, 2))) {
                        console.log(`Directory ${ matchDir.displayName }(${ matchDir.name }) no modify permission!`);
                        response.errorList.push(objectID);
                        continue;
                    }
                    console.log(`Directory ${ matchDir.displayName }(${ matchDir.name })  has modify permission!`);
                    const directoryModel = DirectoryModelFactory.createNewDirectory(matchDir);
                    sourceDirList.add(directoryModel.parent);
                    oldDirectories.push(directoryModel);
                }
            } 
        }
        if(sourceDirList.has(dest) || oldDirectories.find((item) => item.getName() === dest)) {
            console.error('Error');
            response.msg = `${ response.msg } dest = source or source already in dest.`
            return ctx.body = response;
        }
    
        const modifiedTime = new Date();
        for(const oldFileModel of oldFiles) {
            const newFileModel = FileModelFactory.createNewFile(JSON.parse(oldFileModel.toJSONString()));
            newFileModel.parent = dest;
            newFileModel.modifiedTime = modifiedTime;
            const result = await mongo.updateFromCollection('files', {
                findOptions: {
                    'name': oldFileModel.getName()
                },
                setOptions: JSON.parse(newFileModel.toUpdatedJSONString())
            });
    
            if(!(result.modifiedCount)) {
                console.error(`Error on updating ${ oldFileModel.getName() }`);
            } else {
                console.log(`Update ${ newFileModel.getName() } success!`)
            }
        }
    
        for(const oldDirModel of oldDirectories) {
            const filtered = Object.keys(JSON.parse(oldDirModel.toJSONString()))
                .filter(key => !['name', 'parent','modifiedTime', 'drop_info'].includes(key))
                .reduce((obj, key) => {
                    obj[key] = oldDirModel[key];
                    return obj;
                }, {});
            const newDirModel = DirectoryModelFactory.createNewDirectory({
                name: utils.createGUID(),
                parent: dest,
                modifiedTime,
                drop_info: [
                    null,
                    null
                ],
                ...filtered
            });
            
            const resultNewDir = await mongo.insertToCollection('directories', [ JSON.parse(newDirModel.toJSONString()) ]);
            const resultFiles = await mongo.updateFromCollection('files', {
                findOptions: {
                    'parent': oldDirModel.getName(),
                    'drop_info.1': { $eq: null }
                },
                setOptions: {
                    'parent': newDirModel.getName(),
                    'modifiedTime': modifiedTime
                }
            }, true);
            const resultDirs = await mongo.updateFromCollection('directories', {
                findOptions: {
                    'parent': oldDirModel.getName(),
                    'drop_info.1': { $eq: null }
                },
                setOptions: {
                    'parent': newDirModel.getName(),
                    'modifiedTime': modifiedTime
                }
            }, true);
            
            if(resultNewDir.insertedCount === 1) {
                console.log(`Old: ${ oldDirModel.getName() }, New: ${ newDirModel.getName() }.`);
            } else {
                console.error(`Error on inserting ${ newDirModel.getName() }`);
            }   
        }
    
        for(const oldDirModel of oldDirectories) {
            // const resultFiles = await mongo.findFromCollection('files', { 'parent': oldDirModel.getName() });
            // const resultDirs = await mongo.findFromCollection('Directories', { 'parent': oldDirModel.getName() });
    
            // if(!(resultFiles.length || resultDirs.length)) {
            //     console.log(`No object is associated with: ${ oldModel.getName() }, directory will be deleted.`);
            //     const result = await mongo.deleteFromCollection('directories', { 'name': oldDirModel.getName() });
            //     if(result.deletedCount === 1) {
            //         console.log(`Delete directory ${ oldModel.getName() } success!`);
            //     } else {
            //         console.error(`Delete directory ${ oldModel.getName() } failed!`);
            //     }
            // } else {
            //     console.log(`Find object is associated with: ${ oldModel.getName() }, directory will not be deleted.`);
            // }
    
            const result = await mongo.deleteFromCollection('directories', { 'name': oldDirModel.getName() });
            if(result.deletedCount === 1) {
                console.log(`Delete directory ${ oldDirModel.getName() } success!`);
            } else {
                console.error(`Delete directory ${ oldDirModel.getName() } failed!`);
            }
        }
    
        if(response.errorList.length === 0) {
            response.errorno = 0;
            response.msg = 'Move operation completed!';
        } else {
            response.errorno = 999;
            response.msg = `Move operation completed!(${ JSON.stringify(response.errorList, null , 2) } failed!)`;
        }
        
    }
    
    return ctx.body = response;
});

router.post('/edit', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const action = reqData.action;
    const objectID = reqData.objectID;
    const newObjectDisplayName = reqData.value;
    // console.log(objectID, newObjectDisplayName);

    const response = {
        errorno: -1,
        msg: 'Update failed!'
    };

    if(objectID) {
        // Todo: Permission check -> object permission check(unsafe)
        // Todo: Permission modify

        const matchFiles = await mongo.findFromCollection('files', { "name": objectID });
        console.log(matchFiles);
        if(matchFiles.length === 1 ) {
            const matchFile = matchFiles[0];

            if(await Permission.unsafe_validate(matchFile, accessToken, 2)) {
                try {
                    const fileModel = FileModelFactory.createNewFile(matchFile);
                    // console.log(fileModel.toJSONString());
                    // const extension = Mime.extension(fileModel.mime); // audio/mp3 -> mpga(wrong)
                    const extension = fileModel.displayName.slice(fileModel.displayName.lastIndexOf('.') + 1);
                    fileModel.displayName = `${ newObjectDisplayName }.${ extension }`;
                    fileModel.modifiedTime = new Date();
                    // console.log(fileModel.toJSONString());
                    // console.log(fileModel.toUpdatedJSONString());
                    const result = await mongo.updateFromCollection('files', {
                        findOptions: {
                            name: fileModel.getName()
                        },
                        setOptions: JSON.parse(fileModel.toUpdatedJSONString())
                     });
    
                    if(result.modifiedCount === 1){
                        // ctx.body = {
                        //     errorno: 0,
                        //     msg: 'Update file success!'
                        // }
    
                        response.errorno = 0;
                        response.msg = 'Update file success!';
                    } else {
                        // ctx.body = {
                        //     errorno: -1,
                        //     msg: 'Update file failed!'
                        // }
    
                        response.errorno = -1;
                        response.msg = 'Update file failed!';
                    }  
                } catch(err) {
                    console.error(err);
                }
            } else {
                response.errorno = 1;
                response.msg = `Update file failed!(File ${ matchFile.displayName }(${ matchFile.name }) has no modify permission.)`;
            }
        } else {
            const matchDirs = await mongo.findFromCollection('directories', { "name": objectID });

            // Todo: directory
            const matchDir = matchDirs[0];

            if(await Permission.unsafe_validate(matchDir, accessToken, 2)) {
                try {
                    const directoryModel = DirectoryModelFactory.createNewDirectory(matchDir);
                    // console.log(directoryModel.toJSONString());
                    directoryModel.displayName = `${ newObjectDisplayName }`;
                    directoryModel.modifiedTime = new Date();
                    // console.log(directoryModel.toJSONString());
                    // console.log(directoryModel.toUpdatedJSONString());
                    const result = await mongo.updateFromCollection('directories', {
                        findOptions: {
                            name: directoryModel.getName()
                        },
                        setOptions: JSON.parse(directoryModel.toUpdatedJSONString())
                     });
    
                    if(result.modifiedCount === 1){
                        // ctx.body = {
                        //     errorno: 0,
                        //     msg: 'Update directory success!'
                        // }
    
                        response.errorno = 0;
                        response.msg = 'Update directory success!';
                    } else {
                        // ctx.body = {
                        //     errorno: -1,
                        //     msg: 'Update directory failed!',
                        // }
    
                        response.errorno = -1;
                        response.msg = 'Update directory failed!';
                    }  
                } catch(err) {
                    console.error(err);
                }
            } else {
                response.errorno = 1;
                response.msg = `Update directory failed!(Directory ${ matchDir.displayName }(${ matchDir.name }) has no modify permission.)`;
            }
        }
    }

    return ctx.body = response;
});

router.post('/recycleBin', async (ctx) => {
    const reqData = ctx.request.query;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);

    const response = {
        errorno: -1,
        msg: '',
        data: []
    }

    const dirList = [];

    let result = await mongo.aggregateFromCollection('directories', [
        // { $match: { "drop_info.0": { $type: 'object' }, "visible": false } },
        { $match: { "drop_info.0": { $type: 'array' } } },
        { $group: { "_id": "$parent", records: { "$push": '$$ROOT' } } }
    ]);

    // Todo: permission check -> object check foreach(unsafe)

    if(result instanceof Array) {
        for(const [ idx, item ] of result.entries()) {
            // console.log(item._id, item.record);
            
            for(record of item.records) {
                if(!(await Permission.unsafe_validate(record, accessToken))) {
                    continue;
                }
                const directoryModel = DirectoryModelFactory.createNewDirectory(record);
                const dir = JSON.parse(directoryModel.toJSONString());
                response.data.push({
                    name: dir.name,
                    displayName: dir.displayName,
                    path: utils.buildPathFromDirTree(dir.drop_info[0]).displayPath,
                    type: 'directory',
                    dropTime: dir.drop_info[1]
                });
                dirList.push(dir);
            }
        }
    }

    result = await mongo.aggregateFromCollection('files', [
        // { $match: { "drop_info.0": { $type: 'object' }, "visible": false } },
        { $match: { "drop_info.0": { $type: 'array' }, "visible": false } },
        { $group: { "_id": "$parent", records: { "$push": '$$ROOT' } } }
    ]);
 
    if(result instanceof Array) {
        for(const [ idx, item ] of result.entries()) {
            // console.log(item._id, item.record);
            
            for(record of item.records) {
                if(!(await Permission.unsafe_validate(record, accessToken))) {
                    continue;
                }
                const fileModel = FileModelFactory.createNewFile(record);
                const file = JSON.parse(fileModel.toJSONString());

                // Hide files if parent directory has been droped
                // if(dirList.find((item) => item.name === file.parent) === undefined) {
                //     response.data.push({
                //         name: file.name,
                //         displayName: file.displayName,
                //         path: utils.buildPathFromDirTree(file.drop_info[0]).displayPath,
                //         type: 'file',
                //         dropTime: file.drop_info[1]
                //     });
                // }

                if(dirList.find((item) => (item.name === file.parent) && (item.drop_info[1].toString() === file.drop_info[1].toString())) === undefined) {
                    response.data.push({
                        name: file.name,
                        displayName: file.displayName,
                        path: utils.buildPathFromDirTree(file.drop_info[0]).displayPath,
                        type: 'file',
                        dropTime: file.drop_info[1]
                    });
                }
            }
        }
    }
    response.errorno = 0;

    ctx.body = response;
});

router.get('/media', async (ctx) => {
    const reqData = ctx.request.query;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const fileID = reqData.objectID;

    if(fileID) {
        const matchFiles = await mongo.findFromCollection('files', { "name": fileID });
        // console.log(matchFiles);
        if(matchFiles.length === 1 ) {
            // Todo: Permission check -> object permission check(unsafe)

            const matchFile = matchFiles[0];

            if(!(await Permission.unsafe_validate(matchFile, accessToken))) {
                ctx.status = 401;
                return ctx.body = 'Unauthorized';
            }

            // const filePath = path.join(__dirname, `../files/${ matchFile.name }`);
            const filePath = path.join(__dirname, '../', `${ fileStorePath }/${ matchFile.name }`);
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = ctx.request.headers['range'];

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                const chunksize = (end - start) + 1;
                const fileStream = fs.createReadStream(filePath, { start, end });
                ctx.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                ctx.set('Accept-Ranges', 'bytes');
                ctx.set('Content-Length', chunksize);
                ctx.set('Content-Type', matchFile.mime);

                ctx.status = 206;
                return ctx.body = fileStream;
            } else {
                ctx.set('Content-Length', fileSize);
                ctx.set('Content-Type', matchFile.mime);

                ctx.status = 200;
                return ctx.body = fs.createReadStream(filePath);
            }
        }
    }
});

router.post('/settings', async (ctx) => {
    const reqData = ctx.request.body;
    const accessToken = reqData.accessToken || ctx.request.headers['authorization'].split(' ')[1];
    const userInfo = jwt.decode(accessToken);
    const response = {
        errorno: 0,
        msg: '',      
        rawSettingTree: [
            {
                title: 'Profile'
            },
            {
                title: 'Test'
            }
        ]
    }

    return ctx.body = response;
});

module.exports = router;