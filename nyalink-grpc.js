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
        uStream.on('data', (u) => {
            const beUser = {
                sha224uuid: u.user.hash,
                upload: u.traffic_total.upload_traffic,
                download: u.traffic_total.download_traffic,
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
        this.conn.SetUsers(req, (err, res) => {
            if (err) {
                throw err;
            }
        });
    }
    delUser(uraw) {
        const req = {
            status: uraw,
            operation: 1 // Delete
        };
        this.conn.SetUsers(req, (err, res) => {
            if (err) {
                throw err;
            }
        });
    }
    resetTraffic(uraw) {
        uraw.traffic_total.upload_traffic = 0;
        uraw.traffic_total.download_traffic = 0;
        const req = {
            status: uraw,
            operation: 2 // Modify
        };
        this.conn.SetUsers(req, (err, res) => {
            if (err) {
                throw err;
            }
        });
    }
}