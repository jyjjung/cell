
"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import type { UserProfileData } from '@/types';
import { Loader2, Search, UserX } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';

function UserListAvatar({ user }: { user: UserProfileData }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground',
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

interface UserSelectorProps {
  users: UserProfileData[];
  loading: boolean;
  selectedUsers?: string[];
  onSelectionChange: (selectedUids: string[]) => void;
  selectionMode?: 'single' | 'multiple';
  placeholder?: string;
  height?: string;
}

export default function UserSelector({
  users,
  loading,
  selectedUsers = [],
  onSelectionChange,
  selectionMode = 'multiple',
  placeholder = "Search users...",
  height = 'h-[250px]'
}: UserSelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleMultiSelect = (uid: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedUsers, uid]
      : selectedUsers.filter(id => id !== uid);
    onSelectionChange(newSelection);
  };

  const handleSingleSelect = (uid: string) => {
    onSelectionChange([uid]);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${height} border rounded-md`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderUserItem = (user: UserProfileData) => (
    <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-muted" key={user.uid}>
      {selectionMode === 'multiple' ? (
        <Checkbox
          id={`user-selector-${user.uid}`}
          checked={selectedUsers.includes(user.uid)}
          onCheckedChange={(checked) => handleMultiSelect(user.uid, !!checked)}
          className="h-5 w-5"
        />
      ) : (
        <RadioGroupItem value={user.uid} id={`user-selector-${user.uid}`} className="h-5 w-5" />
      )}
      <Label htmlFor={`user-selector-${user.uid}`} className="flex flex-1 items-center gap-3 cursor-pointer">
        <UserListAvatar user={user} />
        <div className="min-w-0">
          <p className="font-semibold truncate">{user.firstName} {user.lastName}</p>
        </div>
      </Label>
    </div>
  );

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      <ScrollArea className={`${height} w-full rounded-md border p-1`}>
        {filteredUsers.length > 0 ? (
          selectionMode === 'single' ? (
            <RadioGroup value={selectedUsers[0] || ""} onValueChange={handleSingleSelect}>
              <div className="space-y-1">
                {filteredUsers.map(user => renderUserItem(user))}
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map(user => renderUserItem(user))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
            <UserX className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">No users found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
