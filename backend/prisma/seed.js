const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDatabase(client = prisma) {
  console.log('Seeding database...');

  // Create Super Admin
  const passwordHash = await bcrypt.hash('SuperAdmin@123', 12);
  let superAdmin;
  try {
    superAdmin = await client.superAdmin.upsert({
      where: { email: 'admin@hostelvideocall.com' },
      update: {},
      create: {
        name: 'Platform Super Admin',
        email: 'admin@hostelvideocall.com',
        passwordHash,
        phone: '9999999999',
      },
    });
  } catch (err) {
    // Fallback: try create directly (upsert may fail on fresh in-memory DB)
    try {
      superAdmin = await client.superAdmin.create({
        data: {
          name: 'Platform Super Admin',
          email: 'admin@hostelvideocall.com',
          passwordHash,
          phone: '9999999999',
        },
      });
    } catch (createErr) {
      superAdmin = await client.superAdmin.findFirst({ where: { email: 'admin@hostelvideocall.com' } });
      if (!superAdmin) throw createErr;
    }
  }
  console.log('Super Admin created:', superAdmin.email);

  // Create sample School
  const schoolPassword = await bcrypt.hash('School@123', 12);
  let school;
  try {
    school = await client.school.upsert({
      where: { schoolCode: 'SCH001' },
      update: {},
      create: {
        schoolCode: 'SCH001',
        name: 'Green Valley Residential School',
        address: 'Pune, Maharashtra',
        contactPerson: 'Principal Sharma',
        contactPhone: '9876543210',
        contactEmail: 'principal@greenvalley.edu',
        passwordHash: schoolPassword,
        callDurationMins: 10,
        isUnlimitedCalls: false,
        perMinuteCharge: 2.5,
        createdById: superAdmin.id,
      },
    });
  } catch (err) {
    try {
      school = await client.school.create({
        data: {
          schoolCode: 'SCH001',
          name: 'Green Valley Residential School',
          address: 'Pune, Maharashtra',
          contactPerson: 'Principal Sharma',
          contactPhone: '9876543210',
          contactEmail: 'principal@greenvalley.edu',
          passwordHash: schoolPassword,
          callDurationMins: 10,
          isUnlimitedCalls: false,
          perMinuteCharge: 2.5,
          createdById: superAdmin.id,
        },
      });
    } catch (createErr) {
      school = await client.school.findFirst({ where: { schoolCode: 'SCH001' } });
      if (!school) throw createErr;
    }
  }
  console.log('School created:', school.name);

  // Create sample Student
  const studentPassword = await bcrypt.hash('Student@123', 12);
  let student;
  try {
    student = await client.student.upsert({
      where: {
        schoolId_studentId: {
          schoolId: school.id,
          studentId: 'STU001',
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        studentId: 'STU001',
        name: 'Rahul Sharma',
        classSection: '10-A',
        roomNo: 'B-204',
        passwordHash: studentPassword,
        walletBalance: 100.0,
      },
    });
  } catch (err) {
    try {
      student = await client.student.create({
        data: {
          schoolId: school.id,
          studentId: 'STU001',
          name: 'Rahul Sharma',
          classSection: '10-A',
          roomNo: 'B-204',
          passwordHash: studentPassword,
          walletBalance: 100.0,
        },
      });
    } catch (createErr) {
      student = await client.student.findFirst({ where: { studentId: 'STU001', schoolId: school.id } });
      if (!student) throw createErr;
    }
  }
  console.log('Student created:', student.name);

  // Create Parent
  let parent;
  try {
    parent = await client.parent.upsert({
      where: { mobile: '9876501234' },
      update: {},
      create: {
        mobile: '9876501234',
        name: 'Mr. Ramesh Sharma',
        relation: 'Father',
      },
    });
  } catch (err) {
    try {
      parent = await client.parent.create({
        data: {
          mobile: '9876501234',
          name: 'Mr. Ramesh Sharma',
          relation: 'Father',
        },
      });
    } catch (createErr) {
      parent = await client.parent.findFirst({ where: { mobile: '9876501234' } });
      if (!parent) throw createErr;
    }
  }
  console.log('Parent created:', parent.name);

  // Link Student-Parent
  try {
    await client.studentParent.upsert({
      where: {
        studentId_parentId: {
          studentId: student.id,
          parentId: parent.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        parentId: parent.id,
        isPrimary: true,
      },
    });
  } catch (err) {
    try {
      await client.studentParent.create({
        data: {
          studentId: student.id,
          parentId: parent.id,
          isPrimary: true,
        },
      });
    } catch (createErr) {
      // Link may already exist
      console.warn('Student-Parent link notice:', createErr.message?.substring(0, 80));
    }
  }
  console.log('Student-Parent linked');

  // Platform settings
  try {
    await client.platformSetting.upsert({
      where: { key: 'default_per_minute_charge' },
      update: {},
      create: {
        key: 'default_per_minute_charge',
        value: '2.50',
        description: 'Default video call charge per minute in INR',
      },
    });
  } catch (err) {
    try {
      await client.platformSetting.create({
        data: {
          key: 'default_per_minute_charge',
          value: '2.50',
          description: 'Default video call charge per minute in INR',
        },
      });
    } catch (createErr) {
      // Setting may already exist
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('\nLogin Credentials:');
  console.log('Super Admin → email: admin@hostelvideocall.com | password: SuperAdmin@123');
  console.log('School      → schoolCode: SCH001 | password: School@123');
  console.log('Student     → studentId: STU001 | password: Student@123');
  console.log('Parent      → mobile: 9876501234 (OTP: 123456)');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedDatabase };
