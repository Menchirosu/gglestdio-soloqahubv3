import React, { createContext, useContext, useState } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
}

const SearchContext = createContext<SearchContextType>({
  searchQuery: '',
  setSearchQuery: () => {},
  selectedItemId: null,
  setSelectedItemId: () => {},
});

export const useSearch = () => useContext(SearchContext);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, selectedItemId, setSelectedItemId }}>
      {children}
    </SearchContext.Provider>
  );
};
