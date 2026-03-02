import { getClient } from "./dist/client.js";

const client = await getClient({ json: true });
const account = await client.account.get();

console.log("=== FULL ACCOUNT RESPONSE ===");
console.log(JSON.stringify(account, null, 2));

if (account.lightningAddress) {
  console.log("\n✅ Lightning Address:", account.lightningAddress);
} else if (account.lnAddress) {
  console.log("\n✅ Lightning Address:", account.lnAddress);
} else if (account.username) {
  console.log("\n✅ Username:", account.username);
  console.log("✅ Lightning Address:", account.username + "@neutron.me");
} else {
  console.log("\n❌ No lightning address field found");
  console.log("Available fields:", Object.keys(account).join(", "));
}
