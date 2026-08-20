const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

// Super Admin: Create / Onboard School
exports.createSchool = async (req, res, next) => {
  try {
    const {
      schoolCode,
      name,
      address,
      contactPerson,
      contactPhone,
      contactEmail,
      password,
      callDurationMins,
      minCallDurationMins,
      maxCallDurationMins,
      isUnlimitedCalls,
      perMinuteCharge,
    } = req.body;

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const school = await prisma.school.create({
      data: {
        schoolCode,
        name,
        address,
        contactPerson,
        contactPhone,
        contactEmail,
        passwordHash,
        callDurationMins: callDurationMins || 10,
        minCallDurationMins: minCallDurationMins || 5,
        maxCallDurationMins: maxCallDurationMins || 60,
        isUnlimitedCalls: isUnlimitedCalls || false,
        perMinuteCharge: perMinuteCharge !== undefined ? parseFloat(perMinuteCharge) : 2.5,
        createdById: req.user.id,
      },
    });

    const { passwordHash: _, ...safeSchool } = school;
    res.status(201).json({ success: true, data: safeSchool });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Toggle School Active
exports.toggleSchoolStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({ where: { id: parseInt(id) } });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const updated = await prisma.school.update({
      where: { id: parseInt(id) },
      data: { isActive: !school.isActive },
    });

    const { passwordHash: _, ...safeUpdated } = updated;
    res.json({ success: true, data: safeUpdated });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Update School Details
exports.updateSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      contactPerson,
      contactPhone,
      contactEmail,
      password,
      callDurationMins,
      minCallDurationMins,
      maxCallDurationMins,
      isUnlimitedCalls,
      perMinuteCharge,
    } = req.body;

    const updateData = {
      ...(name && { name: name.trim() }),
      ...(address !== undefined && { address: address ? address.trim() : '' }),
      ...(contactPerson !== undefined && { contactPerson: contactPerson ? contactPerson.trim() : '' }),
      ...(contactPhone !== undefined && { contactPhone: contactPhone ? contactPhone.trim() : '' }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail ? contactEmail.trim() : '' }),
      ...(callDurationMins !== undefined && { callDurationMins: parseInt(callDurationMins, 10) }),
      ...(minCallDurationMins !== undefined && { minCallDurationMins: parseInt(minCallDurationMins, 10) }),
      ...(maxCallDurationMins !== undefined && { maxCallDurationMins: parseInt(maxCallDurationMins, 10) }),
      ...(isUnlimitedCalls !== undefined && { isUnlimitedCalls: Boolean(isUnlimitedCalls) }),
      ...(perMinuteCharge !== undefined && { perMinuteCharge: parseFloat(perMinuteCharge) }),
    };

    if (password && password.trim().length >= 4) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    const updated = await prisma.school.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    const { passwordHash: _, ...safeUpdated } = updated;
    res.json({ success: true, data: safeUpdated });
  } catch (error) {
    next(error);
  }
};

// School Admin & Super Admin: Update Video Call Pricing
exports.updateSchoolPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = parseInt(id, 10);
    const { perMinuteCharge, minCallDurationMins, maxCallDurationMins, callDurationMins } = req.body;

    // Authorization: Only SuperAdmin or the specific School Admin
    if (req.user.role === 'school' && req.user.schoolId !== schoolId) {
      return res.status(403).json({ success: false, message: 'You can only update pricing for your own school' });
    }

    // Validation
    const price = parseFloat(perMinuteCharge);
    if (isNaN(price) || price <= 0 || price > 1000) {
      return res.status(400).json({ success: false, message: 'Price per minute must be greater than ₹0 and reasonable (e.g. max ₹1000)' });
    }

    const minDur = parseInt(minCallDurationMins, 10);
    if (isNaN(minDur) || minDur < 1 || minDur > 120) {
      return res.status(400).json({ success: false, message: 'Minimum call duration must be at least 1 minute' });
    }

    const maxDur = parseInt(maxCallDurationMins, 10);
    if (isNaN(maxDur) || maxDur < minDur || maxDur > 240) {
      return res.status(400).json({ success: false, message: 'Maximum call duration must be greater than or equal to minimum duration' });
    }

    const defaultDur = callDurationMins ? parseInt(callDurationMins, 10) : minDur;

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        perMinuteCharge: price,
        minCallDurationMins: minDur,
        maxCallDurationMins: maxDur,
        callDurationMins: defaultDur >= minDur && defaultDur <= maxDur ? defaultDur : minDur,
      },
    });

    const { passwordHash: _, ...safeUpdated } = updated;
    res.json({
      success: true,
      message: 'Video call pricing updated successfully',
      data: safeUpdated,
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin / School: Update pricing & call settings (General patch)
exports.updateSchoolSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { callDurationMins, minCallDurationMins, maxCallDurationMins, isUnlimitedCalls, perMinuteCharge } = req.body;

    // Only SuperAdmin or the school itself
    if (req.user.role === 'school' && req.user.schoolId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const updated = await prisma.school.update({
      where: { id: parseInt(id) },
      data: {
        ...(callDurationMins !== undefined && { callDurationMins: parseInt(callDurationMins, 10) }),
        ...(minCallDurationMins !== undefined && { minCallDurationMins: parseInt(minCallDurationMins, 10) }),
        ...(maxCallDurationMins !== undefined && { maxCallDurationMins: parseInt(maxCallDurationMins, 10) }),
        ...(isUnlimitedCalls !== undefined && { isUnlimitedCalls: Boolean(isUnlimitedCalls) }),
        ...(perMinuteCharge !== undefined && { perMinuteCharge: parseFloat(perMinuteCharge) }),
      },
    });

    const { passwordHash: _, ...safeUpdated } = updated;
    res.json({ success: true, data: safeUpdated });
  } catch (error) {
    next(error);
  }
};

// Get School Active Pricing
exports.getSchoolPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        schoolCode: true,
        name: true,
        perMinuteCharge: true,
        minCallDurationMins: true,
        maxCallDurationMins: true,
        callDurationMins: true,
        isUnlimitedCalls: true,
        isActive: true,
      },
    });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    next(error);
  }
};

// List Schools (Super Admin)
exports.listSchools = async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
      },
    });
    
    // Omit passwordHash from each record
    const safeSchools = schools.map(({ passwordHash, ...rest }) => rest);
    res.json({ success: true, data: safeSchools });
  } catch (error) {
    next(error);
  }
};

// Get single school
exports.getSchool = async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        _count: { select: { students: true } },
      },
    });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const { passwordHash: _, ...safeSchool } = school;
    res.json({ success: true, data: safeSchool });
  } catch (error) {
    next(error);
  }
};
