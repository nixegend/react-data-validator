import './range-input.scss';

import React, { useCallback, useEffect, useState } from 'react';

import { throttle } from '@/components/utils';

type PropsTypes = {
  value: number | undefined;
  label: string;
  name?: string;
  delay?: number;
  min: number;
  max: number;
  onChange: (v: number, name?: string) => void;
};

export default function RangeInput({
  label,
  name,
  value = 0,
  delay = 1000,
  min,
  max,
  onChange
}: PropsTypes): JSX.Element {
  const [localValue, setLocalValue] = useState<number | undefined>();

  useEffect(() => {
    if (value !== localValue) {
      const incomingValue = Number(value);
      const currentValue = Number(localValue);
      if (!isNaN(currentValue) && !isNaN(incomingValue) && incomingValue !== currentValue) {
        setLocalValue(incomingValue as unknown as number);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedChangeHandler = useCallback(
    throttle(val => {
      onChange(val, name);
    }, delay),
    [onChange]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    const n = Number(val);
    const parsedNumber = !isNaN(n) ? n : 0;
    debouncedChangeHandler(parsedNumber);
    setLocalValue(parsedNumber as unknown as number);
  };

  return (
    <div className="range-input-row">
      <label>
        {`${label} (${localValue || 0})`}
        <input
          type="range"
          value={localValue || 0}
          name={name}
          min={min}
          max={max}
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
