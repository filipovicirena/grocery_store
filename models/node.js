const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Node',
            default: null
        }
    }
);
module.exports = mongoose.model('Node', nodeSchema);
