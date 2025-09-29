"use client";
import { CustomButton, SectionTitle } from "@/components";
import { isValidEmailAddressFormat } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api";
import { sanitizeFormData } from "@/lib/form-sanitize";

interface UserProfile {
  id: string;
  email: string;
  role: string;
}

const ProfilePage = () => {
  const { data: session, status: sessionStatus, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [sessionStatus, router]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.email) {
        try {
          const response = await apiClient.get(`/api/users/email/${session.user.email}`);
          const userData = await response.json();
          
          if (response.ok) {
            setUserProfile(userData);
            setFormData(prev => ({
              ...prev,
              email: userData.email,
            }));
          } else {
            toast.error("Failed to load profile data");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast.error("Failed to load profile data");
        }
      }
    };

    if (sessionStatus === "authenticated") {
      fetchUserProfile();
    }
  }, [session?.user?.email, sessionStatus]);

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email) return "Email is required";
    if (!isValidEmailAddressFormat(email)) return "Invalid email format";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (password && !confirmPassword) return "Please confirm your new password";
    if (password && confirmPassword && password !== confirmPassword) {
      return "Passwords do not match";
    }
    return "";
  };

  // Handle input changes with validation
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific error when user starts typing
    setErrors(prev => ({ ...prev, [field]: "" }));
    
    // Validate on change
    if (field === "email") {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    } else if (field === "newPassword") {
      const passwordError = validatePassword(value);
      const confirmError = validateConfirmPassword(value, formData.confirmPassword);
      setErrors(prev => ({ 
        ...prev, 
        newPassword: passwordError,
        confirmPassword: confirmError 
      }));
    } else if (field === "confirmPassword") {
      setErrors(prev => ({ 
        ...prev, 
        confirmPassword: validateConfirmPassword(formData.newPassword, value) 
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const emailError = validateEmail(formData.email);
    const newPasswordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(formData.newPassword, formData.confirmPassword);
    
    // Check if current password is provided when changing password
    let currentPasswordError = "";
    if (formData.newPassword && !formData.currentPassword) {
      currentPasswordError = "Current password is required to change password";
    }

    setErrors({
      email: emailError,
      currentPassword: currentPasswordError,
      newPassword: newPasswordError,
      confirmPassword: confirmPasswordError,
    });

    // If there are validation errors, don't submit
    if (emailError || currentPasswordError || newPasswordError || confirmPasswordError) {
      return;
    }

    setLoading(true);

    try {
      // Sanitize form data
      const sanitizedData = sanitizeFormData({
        email: formData.email,
        ...(formData.newPassword && { 
          password: formData.newPassword,
          currentPassword: formData.currentPassword 
        })
      });

      const response = await apiClient.put(`/api/users/${userProfile?.id}/profile`, sanitizedData);
      const result = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully!");
        
        // If email was changed, update the session
        if (formData.email !== session?.user?.email) {
          await update({
            ...session,
            user: {
              ...session?.user,
              email: formData.email,
            },
          });
        }

        // Clear password fields after successful update
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    
    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await apiClient.delete(`/api/users/${userProfile?.id}`);
      
      if (response.ok) {
        toast.success("Account deleted successfully");
        // Sign out and redirect to home
        await signOut({ callbackUrl: "/" });
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return null; // Will redirect to login
  }

  return (
    <div className="bg-white min-h-screen">
      <SectionTitle title="Profile Settings" path="Home | Profile" />
      
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and security settings</p>
          </div>

          {/* Profile Info Card */}
          <div className="bg-base-200 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">User ID</span>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{userProfile?.id}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Role</span>
                <p className="capitalize">
                  <span className={`badge ${userProfile?.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                    {userProfile?.role}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Section */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Email Address</span>
              </label>
              <input
                type="email"
                className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.email}</span>
                </label>
              )}
            </div>

            {/* Password Change Section */}
            <div className="divider">
              <span className="text-lg font-semibold">Change Password</span>
            </div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Current Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered w-full ${errors.currentPassword ? 'input-error' : ''}`}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                placeholder="Enter current password to change password"
              />
              {errors.currentPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.currentPassword}</span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">New Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered w-full ${errors.newPassword ? 'input-error' : ''}`}
                value={formData.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                placeholder="Enter new password (optional)"
              />
              {errors.newPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.newPassword}</span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Confirm New Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered w-full ${errors.confirmPassword ? 'input-error' : ''}`}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.confirmPassword}</span>
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                ) : null}
                {loading ? "Updating..." : "Update Profile"}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-outline"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="divider mt-12">
            <span className="text-lg font-semibold text-error">Danger Zone</span>
          </div>
          
          <div className="bg-error bg-opacity-10 border border-error border-opacity-20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-error mb-2">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="btn btn-error btn-outline"
              disabled={loading}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;