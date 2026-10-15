const Node = require("../models/node.js");

async function getNodeAndDescendantIds(rootNodeId){
    const nodes = await Node.find().select("_id parent");

    const descendantIds = [rootNodeId.toString()];
    const nodesToCheck = [rootNodeId.toString()];
    while (nodesToCheck.length > 0) {
            const currentId = nodesToCheck.pop();

            const children = nodes.filter(node =>
                node.parent &&
                node.parent.toString() === currentId
            );

            for (const child of children) {
                const childId = child._id.toString();

                descendantIds.push(childId);
                nodesToCheck.push(childId);
            }
        }

    return descendantIds;
}

module.exports = getNodeAndDescendantIds;