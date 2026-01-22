import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const UsageStats = ({ userPlan }) => {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchUsageStats();
    }
  }, [user?.id]);

  const getUserLimits = (plan) => {
    const limits = {
      'freemium': { tasks: 100, images: 20 },
      'starter': { tasks: 1000, images: 200 },
      'advanced': { tasks: 5000, images: 800 },
      'pro': { tasks: -1, images: 1500 }, // -1 = unlimited tasks
      'admin': { tasks: -1, images: -1 } // Admin = unlimited everything
    };
    return limits[plan] || limits['freemium'];
  };

  const fetchUsageStats = async () => {
    try {
      setLoading(true);

      // Fetch profile data directly from Supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_plan, tasks_completed_this_month, images_generated_this_month, current_month_start')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching usage stats from Supabase:', error);
        return;
      }

      if (!profile) {
        console.error('No profile data found');
        return;
      }

      console.log('Fetched profile data from Supabase:', profile);

      // Determine the user's plan (use the passed prop or fetched data)
      const plan = userPlan || profile.subscription_plan || 'freemium';
      setUserSubscriptionPlan(plan);

      // Map database plan names to our credit service plan names (case-insensitive)
      const planMapping = {
        'starter': 'starter',
        'free_trial': 'freemium',  // Map free_trial to freemium for credit limits
        'pro': 'pro',
        'admin': 'admin',
        'advanced': 'advanced'
      };
      const creditPlan = planMapping[plan.toLowerCase()] || 'freemium';

      // Get limits for the plan
      const limits = getUserLimits(creditPlan);

      // Format the usage data
      const usageData = {
        tasks_used: profile.tasks_completed_this_month || 0,
        tasks_limit: limits.tasks,
        images_used: profile.images_generated_this_month || 0,
        images_limit: limits.images,
        month_start: profile.current_month_start
      };

      console.log('Processed usage stats:', usageData);
      setUsage(usageData);

    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything while loading for the first time
  if (!usage) return null;

  const getProgressColor = (used, limit) => {
    const percentage = limit === -1 ? 0 : (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit) => {
    return limit === -1 ? '∞' : limit.toString();
  };

  return (
    <div className={`space-y-3 ${loading ? 'opacity-75' : ''}`}>
      <h3 className="text-xs font-normal text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {userSubscriptionPlan ? `${userSubscriptionPlan.replace('_', ' ').toUpperCase()} - ` : ''}Monthly Usage
        {loading && <span className="ml-1 text-xs">⟳</span>}
      </h3>

      <div className="space-y-3">
        {/* Tasks Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">Tasks</span>
            <span className="text-gray-500 dark:text-gray-100 font-medium">
              {usage.tasks_used}/{usage.tasks_limit === -1 ? '∞' : formatLimit(usage.tasks_limit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            {usage.tasks_limit === -1 ? (
              <div className="w-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full h-1.5">
              </div>
            ) : (
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(usage.tasks_used, usage.tasks_limit)}`}
                style={{
                  width: `${Math.min((usage.tasks_used / (usage.tasks_limit === -1 ? usage.tasks_used + 1 : usage.tasks_limit)) * 100, 100)}%`
                }}
              ></div>
            )}
          </div>
        </div>

        {/* Images Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">Posts</span>
            <span className="text-gray-500 dark:text-gray-100 font-medium">
              {usage.images_used}/{usage.images_limit === -1 ? '∞' : formatLimit(usage.images_limit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            {usage.images_limit === -1 ? (
              <div className="w-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full h-1.5">
              </div>
            ) : (
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(usage.images_used, usage.images_limit)}`}
                style={{
                  width: `${Math.min((usage.images_used / usage.images_limit) * 100, 100)}%`
                }}
              ></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageStats;
