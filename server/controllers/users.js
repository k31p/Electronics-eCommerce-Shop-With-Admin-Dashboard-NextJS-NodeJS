const prisma = require("../utills/db");
const bcrypt = require("bcryptjs");
const { asyncHandler, AppError } = require("../utills/errorHandler");

// Helper function to exclude password from user object
function excludePassword(user) {
  if (!user) return user;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

const getAllUsers = asyncHandler(async (request, response) => {
  const users = await prisma.user.findMany({});
  // Exclude password from all users
  const usersWithoutPasswords = users.map(user => excludePassword(user));
  return response.json(usersWithoutPasswords);
});

const createUser = asyncHandler(async (request, response) => {
  const { email, password, role } = request.body;

  // Basic validation
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }

  // Password validation
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 14);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: role || "user",
    },
  });
  // Exclude password from response
  return response.status(201).json(excludePassword(user));
});

const updateUser = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { email, password, role } = request.body;

  if (!id) {
    throw new AppError("User ID is required", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Prepare update data
  const updateData = {};
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError("Invalid email format", 400);
    }
    updateData.email = email;
  }
  if (password) {
    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400);
    }
    updateData.password = await bcrypt.hash(password, 14);
  }
  if (role) {
    updateData.role = role;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: updateData,
  });

  // Exclude password from response
  return response.status(200).json(excludePassword(updatedUser));
});

// New function specifically for user profile updates (with current password validation)
const updateUserProfile = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { email, password, currentPassword } = request.body;

  if (!id) {
    throw new AppError("User ID is required", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // If password is being changed, validate current password
  if (password) {
    if (!currentPassword) {
      throw new AppError("Current password is required to change password", 400);
    }

    // Check if current password is correct (only for users with passwords - not OAuth users)
    if (existingUser.password) {
      const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isCurrentPasswordCorrect) {
        throw new AppError("Current password is incorrect", 401);
      }
    } else {
      // User signed up via OAuth and doesn't have a password
      throw new AppError("Cannot change password for OAuth accounts", 400);
    }

    if (password.length < 8) {
      throw new AppError("New password must be at least 8 characters long", 400);
    }
  }

  // Check if email is being changed and validate it
  if (email && email !== existingUser.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError("Invalid email format", 400);
    }

    // Check if email is already in use by another user
    const emailExists = await prisma.user.findFirst({
      where: {
        email: email,
        NOT: {
          id: id
        }
      },
    });

    if (emailExists) {
      throw new AppError("Email is already in use", 400);
    }
  }

  // Prepare update data
  const updateData = {};
  if (email && email !== existingUser.email) {
    updateData.email = email;
  }
  if (password) {
    updateData.password = await bcrypt.hash(password, 14);
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    return response.status(200).json({
      message: "No changes detected",
      user: excludePassword(existingUser)
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: updateData,
  });

  // Exclude password from response
  return response.status(200).json({
    message: "Profile updated successfully",
    user: excludePassword(updatedUser)
  });
});

const deleteUser = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("User ID is required", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  await prisma.user.delete({
    where: {
      id: id,
    },
  });
  return response.status(204).send();
});

const getUser = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("User ID is required", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });
  
  if (!user) {
    throw new AppError("User not found", 404);
  }
  
  // Exclude password from response
  return response.status(200).json(excludePassword(user));
});

const getUserByEmail = asyncHandler(async (request, response) => {
  const { email } = request.params;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  
  if (!user) {
    throw new AppError("User not found", 404);
  }
  
  // Exclude password from response
  return response.status(200).json(excludePassword(user));
});

module.exports = {
  createUser,
  updateUser,
  updateUserProfile,
  deleteUser,
  getUser,
  getAllUsers,
  getUserByEmail,
};
