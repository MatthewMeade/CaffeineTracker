"use client";

import React from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

interface EmojiPickerProps {
  children: React.ReactNode;
  onSelect: (emoji: string) => void;
}

export function EmojiPickerComponent({ children, onSelect }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0 border-none">
        <EmojiPicker
          onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
          theme={Theme.DARK}
          lazyLoadEmojis
        />
      </PopoverContent>
    </Popover>
  );
}
