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
    addUser(u) {
        const newUser = {
            user: {
                password: u.uuid,
                hash: u.sha224uuid
            },
            traffic_total: {
                upload_traffic: 0,
                download_traffic: 0
            },
            speed_current: {
                upload_speed: 0,
                download_speed: 0
            },
            speed_limit: {
                upload_speed: u.speedlimit,
                download_speed: u.speedlimit
            },
            ip_current: 0,
            ip_limit: u.iplimit
        };
        const req = {
            status: newUser,
            operation: 0 // Add
        };
        this.modifyUser(req);
    }
    modifyUser(req) {
        const dataStream = this.conn.SetUsers((err, res) => {
            if (err) {
                throw err;
            }
        });
        dataStream.write(req);
        dataStream.end();
        dataStream.on('data', (res) => {
            if (!res.success) {
                throw res.info;
            }
        });
        dataStream.on('end', () => {
            // User Add / Delete / Modify success
        });
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