require("dotenv").config();

const mongoose = require("mongoose");
const Node = require("./models/node");

const hierarchy = {
  Srbija: {
    Vojvodina: {
      "Severnbacki okrug": {
        Subotica: {
          "Radnja 1": {},
        },
      },
      "Juznobacki okrug": {
        "Novi Sad": {
          Detelinara: {
            "Radnja 2": {},
            "Radnja 3": {},
          },
          Liman: {
            "Radnja 4": {},
            "Radnja 5": {},
          },
        },
      },
    },
    "Grad Beograd": {
      "Novi Beograd": {
        Bezanija: {
          "Radnja 6": {},
        },
      },
      Vracar: {
        Neimar: {
          "Radnja 7": {},
        },
        "Crveni krst": {
          "Radnja 8": {},
          "Radnja 9": {},
        },
      },
    },
  },
};

async function createNodes(tree, parentId = null) {
  for (const name in tree) {
    const children = tree[name];

    const node = await Node.create({
      name: name,
      parent: parentId,
    });

    console.log("Created node:", name);

    await createNodes(children, node._id);
  }
}
async function initializeNodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB Atlas");

    await Node.deleteMany({});

    console.log("Existing nodes deleted");

    await createNodes(hierarchy);

    console.log("Node initialization complete");
  } catch (error) {
    console.error("Initialization failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

initializeNodes();
