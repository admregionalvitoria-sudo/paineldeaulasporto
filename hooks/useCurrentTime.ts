
import { useState, useEffect } from 'react';

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  const formatOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const formattedDate = new Intl.DateTimeFormat('pt-BR', formatOptions).format(currentTime);
  const formattedTime = currentTime.toLocaleTimeString('pt-BR');

  return {
    formattedDate: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
    formattedTime,
  };
};

export default useCurrentTime;
