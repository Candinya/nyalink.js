// Pre-requirements
const path = require('path');
// External requirements
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

// Load gRPC protobuf
const path_trojan = path.join('protos', 'trojan.proto');
const proto_trojan = protoLoader.loadSync(path_trojan);
const grpc_trojan = grpc.loadPackageDefinition(proto_trojan);

export class gRpc_TrojanGo {
    conn;
    constructor(addr, port) {
        this.conn = new grpc_trojan.TrojanServerService(`${addr}:${port}`, grpc.credentials.createInsecure());
        // Or use secure gRPC with certs (WIP...)
    }
    listUsers() {
        this.conn.ListUsers({}, (err, res) => {
            if (err) {
                throw err;
            } else {
                return res;
            }
        });
    }
    setUsers(req) {
        this.conn.SetUsers(req, (err, res) => {
            if (err) {
                throw err;
            }
        });
    }
}