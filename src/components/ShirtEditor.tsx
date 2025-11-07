import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface ShirtEditorProps {
  title: string;
  imageUrl: string;
  value: { text: string; logo: string };
  onChange: (data: { text: string; logo: string }) => void;
}

const ShirtEditor = ({ title, imageUrl, value, onChange }: ShirtEditorProps) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{title}</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview */}
        <Card className="p-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain"
            />
            {value.text && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 px-4 py-2 rounded shadow-lg">
                  <p className="font-bold text-lg text-center">{value.text}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="text">Adicionar Texto</Label>
            <Textarea
              id="text"
              placeholder="Digite o texto para esta vista..."
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              O texto será posicionado no centro da camisa
            </p>
          </div>

          <div>
            <Label htmlFor="logo">URL do Logo (opcional)</Label>
            <Input
              id="logo"
              type="url"
              placeholder="https://exemplo.com/logo.png"
              value={value.logo}
              onChange={(e) => onChange({ ...value, logo: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Adicione a URL de uma imagem para usar como logo
            </p>
          </div>

          {value.logo && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-2">Preview do Logo:</p>
              <img
                src={value.logo}
                alt="Logo preview"
                className="max-h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShirtEditor;
