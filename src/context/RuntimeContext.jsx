import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';

const RuntimeContext = createContext(null);

export const RuntimeProvider = ({ children }) => {
  const [status, setStatus] = useState('idle'); // idle, booting, ready, error
  const [error, setError] = useState(null);
  const webcontainerInstance = useRef(null);

  const boot = async () => {
    if (webcontainerInstance.current) return webcontainerInstance.current;
    
    try {
      setStatus('booting');
      const instance = await WebContainer.boot();
      webcontainerInstance.current = instance;
      setStatus('ready');
      return instance;
    } catch (err) {
      console.error('WebContainer boot failed:', err);
      setError(err.message);
      setStatus('error');
      throw err;
    }
  };

  const writeFile = async (path, contents) => {
    if (!webcontainerInstance.current) await boot();
    await webcontainerInstance.current.fs.writeFile(path, contents);
  };

  const mount = async (files) => {
    if (!webcontainerInstance.current) await boot();
    await webcontainerInstance.current.mount(files);
  };

  const spawn = async (command, args) => {
    if (!webcontainerInstance.current) await boot();
    return await webcontainerInstance.current.spawn(command, args);
  };

  return (
    <RuntimeContext.Provider value={{ 
      boot, 
      status, 
      error, 
      webcontainer: webcontainerInstance.current,
      writeFile,
      mount,
      spawn
    }}>
      {children}
    </RuntimeContext.Provider>
  );
};

export const useRuntime = () => {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntime must be used within a RuntimeProvider');
  }
  return context;
};
