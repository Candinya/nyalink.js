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

## Config instructions

0. **Please use node v14+ to run this** because this project contains ES6 module import / export features, which is not supported by CommonJS.
1. `git clone https://github.com/nyawork/nyalink.js`
2. `cd nyalink.js`
3. `npm install --only=prod`
4. `cp config.example.yml config.yml`
5. Edit `config.yml`
6. `node nyalink.js` or use a daemon to run it, like pm2 (`pm2 start nyalink.js --name nyalink-js`) / screen.

## Docker Version

🚧WIP...

## Backend Config examples

### trojan-go

``` json config.json
{
    "run_type": "server",
    "local_addr": "0.0.0.0",
    "local_port": 18771,
    "remote_addr": "127.0.0.1",
    "remote_port": 8080,
    "password": [
        "default_password"
    ],
    "ssl": {
        "cert": "/var/ssl/cert.crt",
        "key": "/var/ssl/key.key",
        "sni": "example.nyawork.com"
    },
    "router": {
        "enabled": true,
        "block": [
            "geoip:private"
        ],
        "geoip": "./geoip.dat",
        "geosite": "./geosite.dat"
    },
    "api": {
        "enabled": true,
        "api_addr": "127.0.0.1",
        "api_port": 10001,
        "ssl": {
            "enabled": false,
            "key": "",
            "cert": "",
            "verify_client": false,
            "client_cert": []
        }
    }
}
```
