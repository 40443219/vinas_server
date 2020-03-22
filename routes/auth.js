require('dotenv').config();
const router = require('koa-router')();
const jwt = require('jsonwebtoken');
const mongo = require('../db/mongodb');
const utils = require('../utils');

const accessKey = process.env.ACCESSKEY;
const refreshkey = process.env.REFRESHKEY;

router.prefix('/api');

router.post('/auth', async (ctx) => {
    const data = ctx.request.body;
    // console.log(JSON.stringify(data, null, 2));

    // console.log(await mongo.findFromCollection('user', { "name": data.user, "password": data.password }));
    try {
        const matchUsers = await mongo.findFromCollection('user', { "username": data.user, "password": data.password });

        if(matchUsers.length === 1) {
            const matchUser = matchUsers[0];
            // console.log(await Promise.all(matchUser.roles.map(async (role) => await utils.searchGroupByGUID(role))));
            const accessToken = jwt.sign(
                { 
                    name: matchUser.name,
                    username: matchUser.username,
                    displayName: matchUser.displayName,
                    // roles: matchUser.roles,
                    roles: await Promise.all(matchUser.roles.map(async (role) => await utils.searchGroupByGUID(role)))
                },
                accessKey,
                {
                    expiresIn: '30s'
                }
            );
            // console.log(matchUser);
            const refreshToken = jwt.sign(
                { 
                    // name: matchUser.name,
                    username: matchUser.username,
                    displayName: matchUser.displayName
                },
                refreshkey,
                {
                    expiresIn: '1h'
                }
            );

            return ctx.body = {
                errorno: 0,
                msg: 'login success!',
                accessToken,
                refreshToken,
            };
        }
        else {
            return ctx.body = {
                errorno: 1,
                msg: 'username or password error!'
            };
        }

    } catch(err) {
        console.error(err);
        
        return ctx.body = {
            errorno: -1,
            msg: 'Server is busy, please try again latter!'
        };
    }
});

router.post('/authTest', async (ctx) => {
    ctx.body = {
        errorno: 0,
        msg: 'test'
    };
});

router.post('/renewToken', async (ctx) => {
    if(!ctx.request.headers['refreshToken']) {
        ctx.status = 401;
        ctx.body = {
            errorno: -1,
            msg: 'No RefreshToken included in header!'
        };
    } else {
        await jwt.verify(ctx.request.headers['refreshToken'], refreshkey, async (err, decoded) => {
            if(err) {
                console.error(err);
                ctx.status = 401;
                ctx.body = {
                    errorno: 1,
                    msg: 'Invaild RefreshToken'
                };
            } else {
                // console.log(decoded);
                // ctx.body = {
                //     errorno: 0,
                //     msg: decoded.name
                // };
                const matchUsers = await mongo.findFromCollection('user', { "username": decoded.username });

                if(matchUsers.length === 1) {
                    const matchUser = matchUsers[0];
                    const accessToken = jwt.sign(
                        { 
                            name: matchUser.name,
                            username: matchUser.username,
                            displayName: matchUser.displayName,
                            // roles: matchUser.roles,
                            roles: await Promise.all(matchUser.roles.map(async (role) => await utils.searchGroupByGUID(role)))
                        },
                        accessKey,
                        {
                            expiresIn: '30s'
                        }
                    );
                    // console.log(accessToken);
            
                    const refreshToken = jwt.sign(
                        { 
                            // name: matchUser.name,
                            username: matchUser.username,
                            displayName: matchUser.displayName
                        },
                        refreshkey,
                        {
                            expiresIn: '1h'
                        }
                    );
                    // console.log(refreshToken);

                    ctx.body = {
                        errorno: 0,
                        msg: 'Refresh Tokens Success!',
                        accessToken,
                        refreshToken
                    };

                } else {
                    ctx.status = 401;
                    ctx.body = {
                        errorno: 2,
                        msg: 'Invaild username'
                    };
                }
            }
        })
    }
})

module.exports = router;