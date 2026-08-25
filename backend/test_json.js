const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const audit = await prisma.projectAudit.findFirst({ orderBy: { createdAt: 'desc' } });
  if (audit && audit.parsedDocumentJson) {
    console.log(JSON.stringify(JSON.parse(audit.parsedDocumentJson).pages[0], null, 2));
  }
}

main().finally(() => prisma.$disconnect());
