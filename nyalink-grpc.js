// Pre-requirements
import path from 'path';
// External requirements
import grpc from 'grpc';
import protoLoader from '@grpc/proto-loader';

// Load gRPC protobuf
const path_trojan = path.join('protos', 'trojan.proto');
const proto_trojan = protoLoader.loadSync(path_trojan);
const grpc_trojan = grpc.loadPackageDefinition(proto_trojan).trojan.api;

export class gRpc_TrojanGo {
    conn;
    dataStream;
    constructor(addr, port) {
        this.conn = new grpc_trojan.TrojanServerService(`${addr}:${port}`, grpc.credentials.createInsecure());
        // Or use secure gRPC with certs (WIP...)
    }
    listUsers(panelUsers, node, callBackFunc) {
        const userList = [];
        const uStream = this.conn.ListUsers();
        uStream.on('data', (usr) => {
            const u = usr.status;
            const beUser = {
                sha224uuid: u.user.hash,
                upload: u.trafficTotal.uploadTraffic,
                download: u.trafficTotal.downloadTraffic,
                raw: u
            };
            userList.push(beUser);
        });
        uStream.on('end', () => {
            callBackFunc(panelUsers, node, userList);
        });
    }
    modifyUserStart() {
        this.dataStream = this.conn.SetUsers((err, res) => {
            if (err) {
                console.error(err);
            }
        });
        this.dataStream.on('data', (res) => {
            if (!res.success) {
                console.error(res.info);
            }
        });
    }
    modifyUser(req) {
        this.dataStream.write(req);
    }
    modifyUserEnd() {
        this.dataStream.end();
        this.dataStream.on('end', () => {
            // User Add / Delete / Modify success
            console.log('User Add / Delete / Modify success');
        });
    }
    addUser(u) {
        const newUser = {
            user: {
                password: u.uuid,
                hash: u.sha224uuid
            },
            trafficTotal: {
                uploadTraffic: 0,
                downloadTraffic: 0
            },
            speedCurrent: {
                uploadSpeed: 0,
                downloadSpeed: 0
            },
            speedLimit: {
                uploadSpeed: u.speedlimit * 131072, // Trojan-go uses Bps while panel uses Mbps,
                downloadSpeed: u.speedlimit * 131072 // so just multiply 1024 * 1024 / 8, which means 131,072
            },
            ipCurrent: 0,
            ipLimit: u.iplimit
        };
        const req = {
            status: newUser,
            operation: 0 // Add
        };
        this.modifyUser(req);
    }
    delUser(uraw) {
        const req = {
            status: uraw,
            operation: 1 // Delete
        };
        this.modifyUser(req);
    }
    resetTraffic(uraw) {
        uraw.trafficTotal.uploadTraffic = 0;
        uraw.trafficTotal.downloadTraffic = 0;
        const req = {
            status: uraw,
            operation: 2 // Modify
        };
        this.modifyUser(req);
    }
}