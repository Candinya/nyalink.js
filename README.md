# nyalink.js

> A Node.JS middleware connecting Airport(VPN) Panels with backend servers.

**Using gRPC Protocol.**

Inspired by [yahagi.js](https://github.com/trojan-cluster/yahagi.js)

## Supported Now

- Panels
    - [x] [SSPanel-UIM](https://github.com/Anankke/SSPanel-Uim)
    - [ ] V2Board (🚧WIP...)
- Backends
    - [x] [Trojan-Go](https://github.com/p4gefau1t/trojan-go)
    - [ ] V2Ray (🚧WIP...)
- Functions
    - [x] Users management
    - [x] Traffic report
    - [x] Server load report
    - [x] IP / Bandwidth restriction
    - [ ] Backend configs generate (🚧WIP...)

## Using instructions

1. `git clone https://github.com/nyawork/nyalink.js`
2. `npm install`
3. `cp config.example.yml config.yml`
4. Edit `config.yml`
5. `node nyalink.js` or use a daemon to run it, like pm2 / screen.

## Docker Version

🚧WIP...

## Use static gRPC libs (not fully developed)

1. `grpc_tools_node_protoc --js_out=import_style=es6,binary:./ --grpc_out=./ ./protos/trojan.proto`
