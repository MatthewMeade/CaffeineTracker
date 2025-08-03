"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Save } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { api } from "~/trpc/react";
import type { AppRouter } from "~/server/trpc/router";
import { useSession } from "next-auth/react";
import { EmojiPickerComponent } from "./EmojiPicker";

interface Favorite {
  id: string;
  name: string;
  icon: string;
  caffeineMg: number;
}

export function FavoritesManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const { data: session } = useSession();
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkAmount, setNewDrinkAmount] = useState("");
  const [newDrinkIcon, setNewDrinkIcon] = useState("☕");
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null);

  const favoritesQuery = api.favorites.getAll.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  const favorites = favoritesQuery.data ?? [];
  const refetch = favoritesQuery.refetch;
  const utils = api.useUtils();

  const addMutation = api.favorites.add.useMutation({
    onSuccess: async () => {
      await utils.entries.getSuggestions.invalidate();
      await refetch();
      setNewDrinkName("");
      setNewDrinkAmount("");
      setNewDrinkIcon("☕");
    },
  });

  const updateMutation = api.favorites.update.useMutation({
    onSuccess: async () => {
      await utils.entries.getSuggestions.invalidate();
      await refetch();
      setEditingFavorite(null);
    },
  });
  
  const removeMutation = api.favorites.remove.useMutation({
    onSuccess: async () => {
      await utils.entries.getSuggestions.invalidate();
      await refetch();
    },
  });

  const handleAdd = () => {
    const caffeineMg = parseInt(newDrinkAmount, 10);
    if (newDrinkName && caffeineMg > 0) {
      addMutation.mutate({ name: newDrinkName, icon: newDrinkIcon, caffeineMg });
    }
  };

  const handleUpdate = () => {
    if (editingFavorite) {
      updateMutation.mutate(editingFavorite);
    }
  };

  const handleRemove = (id: string) => {
    removeMutation.mutate({ id });
  };

  const renderFavoriteCard = (favorite: Favorite) => (
    <Card
      key={favorite.id}
      className="bg-white/5 border-white/10 backdrop-blur-sm p-4 text-center space-y-2 relative group"
    >
      <div className="text-3xl">{favorite.icon}</div>
      <div className="font-medium text-white text-sm">{favorite.name}</div>
      <div className="text-xs text-cyan-400">{favorite.caffeineMg}mg</div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" onClick={() => setEditingFavorite(favorite)} className="text-cyan-400 hover:text-cyan-300 h-6 w-6 p-0">
          <Save className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handleRemove(favorite.id)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );

  const renderAddOrEdit = () => {
    const isEditing = editingFavorite !== null;

    if (isEditing && editingFavorite) {
      return (
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Edit Favorite</h3>
          <Card className="bg-white/5 border-white/10 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <EmojiPickerComponent onSelect={(emoji) => setEditingFavorite({ ...editingFavorite, icon: emoji })}>
                  <Button variant="outline" className="text-3xl p-6">
                    {editingFavorite.icon}
                  </Button>
                </EmojiPickerComponent>
                <Input
                  value={editingFavorite.name}
                  onChange={(e) => setEditingFavorite({ ...editingFavorite, name: e.target.value })}
                  placeholder="Favorite Name"
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
              <Input
                value={editingFavorite.caffeineMg || ""}
                onChange={(e) => setEditingFavorite({ ...editingFavorite, caffeineMg: parseInt(e.target.value) || 0 })}
                placeholder="Caffeine (mg)"
                type="number"
                className="bg-white/5 border-white/10 text-white h-12"
              />
              <div className="flex gap-2">
                <Button onClick={handleUpdate} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black h-12">
                  <Plus className="w-5 h-5 mr-2" />
                  Save Changes
                </Button>
                <Button onClick={() => setEditingFavorite(null)} variant="ghost" className="w-full text-gray-400 h-12">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Add New Favorite</h3>
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <EmojiPickerComponent onSelect={(emoji) => setNewDrinkIcon(emoji)}>
                <Button variant="outline" className="text-3xl p-6">
                  {newDrinkIcon}
                </Button>
              </EmojiPickerComponent>
              <Input
                value={newDrinkName}
                onChange={(e) => setNewDrinkName(e.target.value)}
                placeholder="Favorite Name"
                className="bg-white/5 border-white/10 text-white h-12"
              />
            </div>
            <Input
              value={newDrinkAmount}
              onChange={(e) => setNewDrinkAmount(e.target.value)}
              placeholder="Caffeine (mg)"
              type="number"
              className="bg-white/5 border-white/10 text-white h-12"
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black h-12">
                <Plus className="w-5 h-5 mr-2" />
                Add Favorite
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };
  
  if (!isOpen || !session?.user?.id) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-cyan-400">Manage Favorites</h2>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-6 overflow-y-auto">
            {editingFavorite ? (
              renderAddOrEdit()
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {renderAddOrEdit()}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Your Favorites ({favorites.length})</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {favorites.map(renderFavoriteCard)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 