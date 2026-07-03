const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const count = await p.commissionRule.count();
  console.log("commissionRules:", count);
  if (count === 0) {
    await p.commissionRule.create({
      data: {
        scope: "GLOBAL",
        commissionType: "PERCENTAGE",
        commissionPercentage: 10,
        currency: "MXN",
        isActive: true,
      },
    });
    console.log("seeded global 10%");
  }
  await p.$disconnect();
})();
