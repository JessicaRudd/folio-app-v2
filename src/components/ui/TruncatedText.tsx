import React, { useState } from 'react';

interface TruncatedTextProps {
  text: string;
  limit?: number;
  className?: string;
}

export const TruncatedText = ({ text, limit = 125, className }: TruncatedTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > limit;

  if (!shouldTruncate) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className={className}>
      <p>
        {isExpanded ? text : `${text.slice(0, limit)}...`}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-2 text-sage font-bold hover:underline focus:outline-none"
        >
          {isExpanded ? 'less' : 'more'}
        </button>
      </p>
    </div>
  );
};
