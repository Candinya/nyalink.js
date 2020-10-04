// Pre-requirements
import fs from 'fs';
import os from 'os';
// External requirements
import yaml from 'js-yaml';

// Load related function files
import { webApi_SSPanel } from './nyalink-webapi.js';
import { gRpc_TrojanGo } from './nyalink-grpc.js';

// Load configurations
const confContents = fs.readFileSync('config.yml', 'utf8');
const confData = yaml.safeLoad(confContents);
console.log(confData.debugMode ? confData : 'Config data load successfully...');

// Define panel webApi constant
let panel;
switch (confData.panel.type.toLowerCase()) {
    case 'sspanel':
        panel = new webApi_SSPanel(confData.panel.type, confData.panel.addr, confData.panel.key);
        break;
    default:
        throw `Panel type ${confData.panel.type} not supported yet!`;
}

// Define server data variables
const nodes = [];

// Initialize servers (use settings in config)
console.log(`Initializing nodes...`);
confData.debugMode || console.log(confData.nodes);
confData.nodes.forEach((node) => {
    confData.debugMode || console.log(node);
    switch (node.type.toLowerCase()) {
        case 'trojan':
            nodes.push({
                panelId: node.id,
                gRpc: new gRpc_TrojanGo(node.apiAddr, node.apiPort)
            });
            break;
        default:
            throw `Backend type ${node.type} not supported yet!`;
    }
});
console.log(`${nodes.length} nodes initialized!`);
confData.debugMode || console.log(nodes);

// Define core functions
/**
 * @method Schedule data report
 */
const scheduleReport = () => {
    setInterval(getUsers, confData.interv.getUser * 1000);
    setInterval(reportLoads, confData.interv.reportLoads * 1000);
    console.log('Schedule setup.');
}

/**
 * @method Get user list for all nodes
 */
const getUsers = () => {
    console.log('Start loading panel users...');
    nodes.forEach((node, no) => {
        panel.getUsers(node.panelId, no, userListCallback);
    });
}

/**
 * @method Get the id of a user (provided by panel) or 0 (if not found)
 * @param panelUsers {Array} List of users responded by panel
 * @param sha224uuid {String} uuid in sha224 hash
 * @returns Id of a user (provided by panel) with the position in panelUsers list
 */
const getUserId = (panelUsers, sha224uuid) => {
    // Simple search
    panelUsers.forEach((u, pos) => {
        if (u.sha224uuid === sha224uuid) {
            // Found
            return {userId: u.id, uidInList: pos};
        }
    });
    // Not found
    return {userId: 0, uidInList: 0};
}

/**
 * @method After got user list for a specify node
 * @param panelUsers {Array} List of users responded by panel
 * @param node {Int8Array} Node ID in this running progress (NOT in panel)
 */
const userListCallback = (panelUsers, node) => {
    console.log('Panel users loaded.');
    confData.debugMode ? console.log(panelUsers) : {};
    // Get backend users list
    console.log('Start loading backend users...');
    const backendUserRequest = nodes[node].gRpc.listUsers();
    const backendUserList = [];
    backendUserRequest.on('data', (u) => {
        backendUserList.push(u);
    });
    backendUserRequest.on('end', () => {
        console.log('Backend users loaded.');
        confData.debugMode ? console.log(backendUserList) : {};
        const trafficLogSet = {
            data: []
        };
        console.log('Start checking users...');
        backendUserList.forEach((u) => {
            const uidpos = getUserId(panelUsers, u.user.hash);
            if (uidpos.userId !== 0 && (u.traffic_total.upload_traffic !== 0 || u.traffic_total.download_traffic !== 0)) {
                // Ready to report traffic
                confData.debugMode || console.log(`User ${panelUsers[uidpos].userId} (${panelUsers[uidpos].email}) exists, uploading traffic...`);
                trafficLogSet.data.push({
                    'u': u.traffic_total.upload_traffic,
                    'd': u.traffic_total.download_traffic,
                    'user_id': uidpos.userId,
                });
                // Reset traffic
                confData.debugMode || console.log(`Traffic ready to push, resetting local records...`);
                u.traffic_total.upload_traffic = 0;
                u.traffic_total.download_traffic = 0;
                nodes[node].gRpc.setUsers({
                    status: u,
                    operation: 2 // Modify
                });
                // Delete after use
                confData.debugMode || console.log(`Traffic reset finish, ready to clean...`);
                panelUsers.splice(uidpos.uidInList, 1);
                confData.debugMode || console.log(`Done for ${panelUsers[uidpos].userId}!`);
            } else {
                // If non-exists => delete record
                confData.debugMode || console.log(`User ${u.user.hash} shouldn't be here, ready to clean...`);
                nodes[node].gRpc.setUsers({
                    status: u,
                    operation: 1 // Delete
                })
                confData.debugMode || console.log(`Done!`);
            }
        });

        // Report traffic
        console.log('Reporting traffic...');
        panel.reportTraffic(nodes[node].panelId, trafficLogSet);

        // Add new user
        panelUsers.forEach((u) => {
            // Not deleted
            confData.debugMode || console.log(`User ${u.userId} (${u.email}) shown up! Preparing...`);
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
                    upload_speed: u.node_speedlimit,
                    download_speed: u.node_speedlimit
                },
                ip_current: 0,
                ip_limit: u.node_connector
            };
            nodes[node].gRpc.setUsers({
                status: newUser,
                operation: 0 // Add
            });
            confData.debugMode || console.log(`Done for ${u.userId}!`);
        });

    });

}

/**
 * @method Report load of all nodes - on this server so status are the same
 */
const reportLoads = () => {
    const osLoad = os.loadavg();
    const upTime = Math.floor(os.uptime());
    nodes.forEach((node) => {
        console.log('Reporting server load...');
        panel.reportNodeLoad(node.panelId, osLoad, upTime);
    });
}

scheduleReport();