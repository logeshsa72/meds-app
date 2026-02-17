import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, UserPlus, Pill, User,
  AlertCircle, CheckCircle, XCircle, Eye,
  EyeOff, Shield, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validatePassword, validateEmail, validateFullName, type PasswordValidation } from '../../utils/validation';

type UserRole = 'patient' | 'caretaker' | '';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    fullName: false,
    role: false
  });

  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    isValid: false,
    errors: [],
    strength: 'weak'
  });

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [nameValid, setNameValid] = useState(true);

  const navigate = useNavigate();

  // Validate password on change
  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePassword(formData.password));
    }
  }, [formData.password]);

  // Check if passwords match
  useEffect(() => {
    if (formData.confirmPassword || formData.password) {
      setPasswordMatch(
        formData.password === formData.confirmPassword
      );
    }
  }, [formData.password, formData.confirmPassword]);

  // Validate email
  useEffect(() => {
    if (formData.email && touched.email) {
      setEmailValid(validateEmail(formData.email));
    }
  }, [formData.email, touched.email]);

  // Validate name
  useEffect(() => {
    if (formData.fullName && touched.fullName) {
      setNameValid(validateFullName(formData.fullName));
    }
  }, [formData.fullName, touched.fullName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setTouched({
      ...touched,
      role: true
    });
  };

  const handleBlur = (field: string) => {
    setTouched({
      ...touched,
      [field]: true
    });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate all fields
  if (!validateFullName(formData.fullName)) {
    setError('Please enter a valid name');
    return;
  }

  if (!validateEmail(formData.email)) {
    setError('Please enter a valid email address');
    return;
  }

  if (!selectedRole) {
    setError('Please select whether you are a patient or caretaker');
    return;
  }

  if (!passwordValidation.isValid) {
    setError('Please meet all password requirements');
    return;
  }

  if (!passwordMatch) {
    setError('Passwords do not match');
    return;
  }

  setIsLoading(true);
  setError('');
  setSuccess('');

  try {
    // Sign up the user with Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          role: selectedRole
        },
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      }
    });

    if (signUpError) throw signUpError;

    if (data?.user) {
      setSuccess('Account created successfully! Please check your email to verify your account.');

      // Clear form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
      });
      setSelectedRole('');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }

  } catch (err: any) {
    // Check for specific error messages
    if (err.message?.includes('Database error saving new user')) {
      setError('Account created but profile setup failed. Please contact support.');
    } else {
      setError(err.message);
    }
    console.error('Signup error:', err);
  } finally {
    setIsLoading(false);
  }
};
  const getStrengthColor = () => {
    switch (passwordValidation.strength) {
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthText = () => {
    switch (passwordValidation.strength) {
      case 'strong': return 'Strong password';
      case 'medium': return 'Medium password';
      default: return 'Weak password';
    }
  };

  return (
    <div className="min-h-screen login_banner bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <Pill className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                {success}
              </div>
              <div className="mt-3 bg-green-100 rounded-lg p-3 text-xs">
                <p className="font-medium text-green-800">Next steps:</p>
                <ol className="list-decimal ml-4 mt-1 text-green-700 space-y-1">
                  <li>Check your email inbox</li>
                  <li>Click the verification link</li>
                  <li>Return here and sign in</li>
                </ol>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('fullName')}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    touched.fullName && !nameValid
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="John Doe"
                />
                {touched.fullName && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {nameValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touched.fullName && !nameValid && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid name</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    touched.email && !emailValid
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } rounded-lg focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="you@example.com"
                />
                {touched.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {emailValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {touched.email && !emailValid && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to use MedBuddy as a: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedRole === 'patient'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="patient"
                    checked={selectedRole === 'patient'}
                    onChange={() => handleRoleChange('patient')}
                    className="sr-only"
                  />
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Patient</span>
                </label>

                <label
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedRole === 'caretaker'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="caretaker"
                    checked={selectedRole === 'caretaker'}
                    onChange={() => handleRoleChange('caretaker')}
                    className="sr-only"
                  />
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Caretaker</span>
                </label>
              </div>
              {touched.role && !selectedRole && (
                <p className="mt-1 text-xs text-red-600">Please select a role</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength meter */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1 text-gray-500" />
                      <span className="text-xs text-gray-600">{getStrengthText()}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {passwordValidation.errors.length} requirements left
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStrengthColor()} transition-all duration-300`}
                      style={{ width: `${((5 - passwordValidation.errors.length) / 5) * 100}%` }}
                    />
                  </div>

                  {/* Password requirements */}
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <RequirementCheck
                      met={formData.password.length >= 8}
                      text="Min 8 characters"
                    />
                    <RequirementCheck
                      met={/[A-Z]/.test(formData.password)}
                      text="Uppercase letter"
                    />
                    <RequirementCheck
                      met={/[a-z]/.test(formData.password)}
                      text="Lowercase letter"
                    />
                    <RequirementCheck
                      met={/[0-9]/.test(formData.password)}
                      text="Number"
                    />
                    <RequirementCheck
                      met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)}
                      text="Special character"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`block w-full pl-10 pr-20 py-3 border ${
                    touched.confirmPassword && !passwordMatch
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {touched.confirmPassword && !passwordMatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !passwordValidation.isValid || !passwordMatch || !emailValid || !nameValid || !selectedRole}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating account...
                </div>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 flex items-start">
              <Shield className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>
                Your password is securely hashed before storage.
                We'll never store or see your actual password.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for password requirements
const RequirementCheck: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className="flex items-center text-xs">
    {met ? (
      <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
    ) : (
      <XCircle className="h-3 w-3 text-gray-300 mr-1" />
    )}
    <span className={met ? 'text-green-600' : 'text-gray-400'}>{text}</span>
  </div>
);

export default Signup;