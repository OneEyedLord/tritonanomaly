exports.handler = async function (event) {
  const { username, groupId } = event.queryStringParameters || {};

  if (!username || !groupId) {
    return respond(400, { error: "Missing username or groupId" });
  }

  const API_KEY = process.env.ROBLOX_API_KEY;

  try {
    // Step 1: resolve username -> userId
    const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    const userData = await userRes.json();
    const user = userData.data?.[0];
    if (!user) return respond(404, { error: "User not found" });

    // Step 2: get membership in specific group via Open Cloud
    const memberRes = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${groupId}/memberships?filter=user==%27users%2F${user.id}%27`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );
    const memberData = await memberRes.json();
    const membership = memberData.groupMemberships?.[0];

    if (!membership) {
      return respond(200, {
        userId: user.id,
        username: user.name,
        inGroup: false,
        rank: 0,
        role: "None",
      });
    }

    // Step 3: get the role details to find rank number
    const roleRes = await fetch(
      `https://apis.roblox.com/cloud/v2/${membership.role}`,
      {
        headers: { "x-api-key": API_KEY },
      }
    );
    const roleData = await roleRes.json();

    return respond(200, {
      userId: user.id,
      username: user.name,
      inGroup: true,
      rank: roleData.rank,
      role: roleData.displayName || roleData.name,
    });

  } catch (err) {
    return respond(500, { error: "Internal error: " + err.message });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
