const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
app.use(express.json());
const filepath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const jwt = require("jsonwebtoken");
/// Initializing
const Initializing = async () => {
  try {
    db = await open({
      filename: filepath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started!");
    });
  } catch (e) {
    console.log("Not Started");
    process.exit(1);
  }
};
Initializing();
/// login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const forQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(forQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const validatingPass = await bcrypt.compare(password, dbUser.password);
    if (validatingPass) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRETE_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//AuthenticatingToken
const AuthenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRETE_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

///getting all states
app.get("/states/", AuthenticateToken, async (request, response) => {
  const getBooksQuery = `
            SELECT
              *
            FROM
             state
             ORDER BY state_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

///getting state bases on stateId
app.get("/states/:stateId/", AuthenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const QueryForSpecificId = `
                            SELECT 
                                 * 
                            FROM 
                                state
                            WHERE 
                                state_id=${stateId};`;
  const specific = await db.get(QueryForSpecificId);
  response.send(specific);
});

///api4
app.post("/districts/", AuthenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const PostingQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  const dbUser = await db.run(PostingQuery);
  response.send("District Successfully Added");
});

///api5
app.get(
  "/districts/:districtId/",
  AuthenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const ForQuery = `SELECT * FROM district WHERE district_id=${districtId};
    `;

    const res = await db.get(ForQuery);
    response.send(res);
  }
);

///api6
app.delete(
  "/districts/:districtId/",
  AuthenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const QueryDelete = `DELETE  FROM district WHERE district_id=${districtId};`;
    const result = await db.run(QueryDelete);
    response.send("District Removed");
  }
);

///api7
app.put(
  "/districts/:districtId/",
  AuthenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const details = request.body;
    const { districtName, stateId, cases, cured, active, deaths } = details;
    const SelectQuery = `
        UPDATE 
        district
        SET 
            district_name="${districtName}",
            state_id=${stateId},
            cases=${cases},
            cured=${cured},
            active=${active},
            deaths=${deaths}
        WHERE
        district_id=${districtId};`;
    await db.run(SelectQuery);
    response.send("District Details Updated");
  }
);

///api8
app.get(
  "/states/:stateId/stats/",
  AuthenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const lastQuery = `SELECT SUM(cases),SUM(cured),SUM(active),SUM(deaths)
    FROM district WHERE state_id=${stateId};`;
    const stats = await db.get(lastQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
    console.log(stats);
  }
);

module.exports = app;
