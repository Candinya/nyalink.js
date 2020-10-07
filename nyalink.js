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
confData.debugMode && console.log('Config data load successfully...');
confData.debugMode && console.log(confData);

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
confData.debugMode && console.log(`Initializing nodes...`);
confData.debugMode && console.log(confData.nodes);
confData.nodes.forEach((node) => {
    switch (node.type.toLowerCase()) {
        case 'trojan':
            nodes.push({
                panelId: node.id,
                gRpc: new gRpc_TrojanGo(node.apiAddr, node.apiPort)
            });
            break;
        default:
            console.error(`Backend type ${node.type} not supported yet!`);
    }
});
confData.debugMode && console.log(`${nodes.length} nodes initialized!`);
confData.debugMode && console.log(nodes);

// Define core functions
/**
 * @method Schedule data report
 */
const scheduleReport = () => {
    setInterval(getUsers, confData.interv.getUser * 1000);
    setInterval(reportLoads, confData.interv.reportLoads * 1000);
    confData.debugMode && console.log('Schedule setup.');
};

/**
 * @method Get user list for all nodes
 */
const getUsers = () => {
    confData.debugMode && console.log('Start loading panel users...');
    nodes.forEach((node, no) => {
        panel.getUsers(node.panelId, no, panelUserListCallback);
    });
};

/**
 * @method Get the id of a user (provided by panel) or 0 (if not found)
 * @param panelUsers {Array} List of users responded by panel
 * @param sha224uuid {String} uuid in sha224 hash
 * @returns Id of a user (provided by panel) with the position in panelUsers list
 */
const getUserId = (panelUsers, sha224uuid) => {
    // Default value
    let uidpos = {userId: -1, pos: -1};
    // Simple search
    panelUsers.forEach((u, pos) => {
        if (u.sha224uuid === sha224uuid) {
            // Found
            uidpos = {userId: u.id, pos: pos};
        }
    });
    return uidpos;
};

/**
 * @method After got user list for a specify node
 * @param panelUsers {Array} List of users responded by panel
 * @param node {Int8Array} Node ID in this running progress (NOT in panel)
 */
const panelUserListCallback = (panelUsers, node) => {
    confData.debugMode && console.log('Panel users loaded.');
    confData.debugMode && console.log(panelUsers);
    // Get backend users list
    confData.debugMode && console.log('Start loading backend users...');
    nodes[node].gRpc.listUsers(panelUsers, node, backendUserListCallback);
};

/**
 * @method After got user list for a specify node
 * @param panelUsers {Array} List of users responded by panel
 * @param backendUserList {Array} List of users responded by backend
 * @param node {Int8Array} Node ID in this running progress (NOT in panel)
 */
const backendUserListCallback = (panelUsers, node, backendUserList) => {
    confData.debugMode && console.log('Backend users loaded.');
    confData.debugMode ? console.log(backendUserList) : {};
    const trafficSet = [];
    confData.debugMode && console.log('Start checking users...');
    // Start modifying users -> open a data stream
    nodes[node].gRpc.modifyUserStart();
    backendUserList.forEach((u) => {
        const uidpos = getUserId(panelUsers, u.sha224uuid);
        if (uidpos.userId !== -1) {
            // Exists
            confData.debugMode && console.log(`User ${panelUsers[uidpos.pos].sha224uuid} (${panelUsers[uidpos.pos].email}) exists!`);
            if ((u.upload || u.download)) {
                // Ready to report traffic
                confData.debugMode && console.log(`Ready to upload traffic for user ${panelUsers[uidpos.pos].userId} ...`);
                trafficSet.push({
                    ul: u.upload,
                    dl: u.download,
                    id: uidpos.userId
                });
                // Reset traffic
                confData.debugMode && console.log(`Traffic ready to push, resetting local records...`);
                nodes[node].gRpc.resetTraffic(u.raw);
            }
            // Delete from array after use
            confData.debugMode && console.log(`Traffic reset finish, ready to clean...`);
            confData.debugMode && console.log(`Done for ${panelUsers[uidpos.pos].sha224uuid}!`);
            panelUsers.splice(uidpos.pos, 1);
        } else {
            // If non-exists => delete record
            confData.debugMode && console.log(`User ${u.sha224uuid} shouldn't be here, ready to clean...`);
            nodes[node].gRpc.delUser(u.raw);
            confData.debugMode && console.log(`Done!`);
        }
    });

    // Report traffic
    confData.debugMode && console.log('Reporting traffic...');
    if (trafficSet.length > 0) {
        panel.reportTraffic(nodes[node].panelId, trafficSet);
    }
    confData.debugMode && console.log('Traffic reported!');

    // Add new user
    panelUsers.forEach((u) => {
        // Not deleted
        confData.debugMode && console.log(`User ${u.sha224uuid} (${u.email}) shown up! Preparing...`);
        const newUser = {
            uuid: u.uuid,
            sha224uuid: u.sha224uuid,
            speedlimit: u.node_speedlimit,
            iplimit: u.node_connector
        };
        nodes[node].gRpc.addUser(newUser);
        confData.debugMode && console.log(`Done!`);
    });
    // All done for this node! Close the data stream.
    nodes[node].gRpc.modifyUserEnd();
};

/**
 * @method Report load of all nodes - on this server so status are the same
 */
const reportLoads = () => {
    const osLoad = os.loadavg()[0];
    const upTime = Math.floor(os.uptime());
    nodes.forEach((node) => {
        confData.debugMode && console.log('Reporting server load...');
        panel.reportNodeLoad(node.panelId, osLoad, upTime);
    });
};

scheduleReport();