import { useCallback, useRef } from 'react';
import useTitrationStore from '../store/useTitrationStore';

/**
 * Hook that provides titration control methods
 */
export default function useTitration() {
  const streamInterval = useRef(null);

  const {
    volumeAdded, expectedVolume, currentColor, maxBuretteVolume,
    dropVolume, streamVolume, colorTransitions,
    addDrop, addStream, addVolume, isDropping, setIsDropping,
    isNearEndpoint, isPastEndpoint, getProgress,
  } = useTitrationStore();

  const buretteLevel = volumeAdded;
  const progress = getProgress();

  const handleDrop = useCallback(() => {
    addDrop();
  }, [addDrop]);

  const startStream = useCallback(() => {
    setIsDropping(true);
    addStream();
    streamInterval.current = setInterval(() => {
      addStream();
    }, 200);
  }, [addStream, setIsDropping]);

  const stopStream = useCallback(() => {
    setIsDropping(false);
    if (streamInterval.current) {
      clearInterval(streamInterval.current);
      streamInterval.current = null;
    }
  }, [setIsDropping]);

  return {
    volumeAdded,
    expectedVolume,
    currentColor,
    maxBuretteVolume,
    buretteLevel,
    progress,
    isDropping,
    handleDrop,
    startStream,
    stopStream,
    isNearEndpoint: isNearEndpoint(),
    isPastEndpoint: isPastEndpoint(),
    dropVolume,
    streamVolume,
  };
}
