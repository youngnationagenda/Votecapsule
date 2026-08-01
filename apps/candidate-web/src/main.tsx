import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import App from './App';
import './styles/globals.css';
const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Provider store={store}><QueryClientProvider client={qc}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></Provider></React.StrictMode>
);
