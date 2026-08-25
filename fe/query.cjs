const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: 'postgresql://postgres.ttfqyqnyjxnvyqbqxcda:Hadir321%28%2A%2A%29@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres' });
prisma.projectAudit.findUnique({where: {id: 'OZK-4B3DA32F'}}).then(console.log).finally(() => prisma.$disconnect());
