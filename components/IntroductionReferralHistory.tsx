import React from 'react';
import { IntroductionReferral, User } from '../types';
import { formatJalaaliDateTime, toPersianDigits } from '../utils/dateFormatter';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import Avatar from './Avatar';

interface IntroductionReferralHistoryProps {
  history: IntroductionReferral[];
  users: User[];
}

const IntroductionReferralHistory: React.FC<IntroductionReferralHistoryProps> = ({ history, users }) => {
  const getUser = (username: string) => {
    return users.find(u => u.username === username);
  };

  if (history.length === 0) {
    return (
        <div className="text-center text-sm text-gray-400 p-4 border border-dashed rounded-md">
            این معرفی تاکنون ارجاع داده نشده است.
        </div>
    );
  }

  return (
    <div className="border rounded-md p-4 bg-gray-50 max-h-60 overflow-y-auto">
      <ol className="relative border-r border-gray-300">
        {history.map((item) => {
          const referrer = getUser(item.referredByUsername);
          const referee = getUser(item.referredToUsername);
          return (
            <li key={item.id} className="mr-6 mb-6">
              <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -right-3 ring-8 ring-gray-50">
                <ArrowLeftIcon />
              </span>
              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 text-sm font-normal text-gray-600">
                     <div className="flex items-center gap-2">
                        <Avatar name={referrer ? `${referrer.firstName} ${referrer.lastName}` : item.referredByUsername} />
                        <div>
                            <p className="font-semibold text-slate-800">{referrer ? `${referrer.firstName} ${referrer.lastName}` : item.referredByUsername}</p>
                            <p className="text-xs text-gray-400">ارجاع دهنده</p>
                        </div>
                     </div>
                     <ArrowLeftIcon />
                     <div className="flex items-center gap-2">
                         <Avatar name={referee ? `${referee.firstName} ${referee.lastName}` : item.referredToUsername} />
                        <div>
                            <p className="font-semibold text-slate-800">{referee ? `${referee.firstName} ${referee.lastName}` : item.referredToUsername}</p>
                            <p className="text-xs text-gray-400">ارجاع گیرنده</p>
                        </div>
                     </div>
                  </div>
                  <time className="block mt-2 sm:mt-0 text-xs font-normal leading-none text-gray-400">
                    {toPersianDigits(formatJalaaliDateTime(new Date(item.referralDate)))}
                  </time>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default IntroductionReferralHistory;
