import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UsageStats = ({ userPlan }) => {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile/usage-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        console.error('Failed to fetch usage stats');
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

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
    <div className="space-y-3">
      <h3 className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {userPlan ? `${userPlan.replace('_', ' ').toUpperCase()} - ` : ''}Monthly Usage
      </h3>

      <div className="space-y-3">
        {/* Tasks Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">Tasks Completed</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
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
            <span className="text-gray-600 dark:text-gray-400">Posts Generated</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
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
