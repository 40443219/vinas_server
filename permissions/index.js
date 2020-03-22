const mongo = require('../db/mongodb');
const jwt = require('jsonwebtoken');
const utils = require('../utils');

class Permission {
    constructor() {
        this.validate = this.validate.bind(this);
    }

    static async unsafe_validate(object, token, mode = 1) {
        const userInfo = jwt.decode(token);
        const authObj = {
            isOwner: [ false, 0 ],
            isGroup: [ false, 0 ],
            isOther: [ false, 0 ]
        }
        const group = await utils.matchGroupByObject(object);
        const { roles } = userInfo;
        const { owner, permissions } = object;
        for(const role of roles) {
            // if(role === owner) {
            //     authObj.isOwner = [ true, permissions[0] ];
            // }
            // if(role === group) {
            //     authObj.isGroup = [ true, permissions[1] ];
            // }
            // accessToken roles data format change: String -> Object
            if(role.name === owner) {
                authObj.isOwner = [ true, permissions[0] ];
            }
            if(role.name === group) {
                authObj.isGroup = [ true, permissions[1] ];
            }
        }
        authObj.isOther = [ true, permissions[2] ];

        // console.log(JSON.stringify(authObj, null, 2));

        if(authObj.isOther[0] && mode <= authObj.isOther[1]) {
            return true;
        } else if (authObj.isGroup[0] && mode <= authObj.isGroup[1]) {
            return true;
        } else if (authObj.isOwner[0] && mode <= authObj.isOwner[1]) {
            return true;
        }

        return false;
    }
}

module.exports = Permission;