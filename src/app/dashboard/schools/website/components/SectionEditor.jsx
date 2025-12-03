import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import FileUploadButton from "@/components/fileupload";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-css';
import 'prismjs/themes/prism.css';
import { LayoutEditor } from './LayoutEditor';

const getCssTemplate = (section) => {
    const sectionId = `#${section.type}`;

    const templates = {
        hero: `/* Target the hero section */
& {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 1rem;
}

/* Target the hero title */
& h1 {
  font-size: 3rem;
  color: white;
}

/* Target the hero subtitle */
& p {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.9);
}

/* Target the CTA button */
& .btn {
  background: #ff6b6b;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
}

/* Target the hero image */
& img {
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}`,
        about: `/* Target the about section */
& {
  background: #f8f9fa;
  padding: 3rem 0;
}

/* Target the section title */
& .section-title {
  color: #2c3e50;
  font-size: 2.5rem;
}

/* Target the content */
& .about-content {
  font-size: 1.125rem;
  line-height: 1.8;
  color: #4a5568;
}`,
        principal: `/* Target the principal section */
& {
  background: white;
  padding: 3rem 0;
}

/* Target the section title */
& .section-title {
  color: #2c3e50;
}

/* Target the principal image */
& img {
  border-radius: 50%;
  border: 4px solid #667eea;
}

/* Target the principal name */
& h3 {
  font-size: 1.5rem;
  color: #667eea;
}

/* Target the message */
& p {
  font-style: italic;
  color: #4a5568;
}`,
        contact: `/* Target the contact section */
& {
  background: #2c3e50;
  color: white;
  padding: 3rem 0;
}

/* Target individual contact items */
& .contact-item {
  padding: 1rem;
  background: rgba(255,255,255,0.05);
}

/* Target contact headings */
& .contact-item h3 {
  color: #3498db;
}`,
        dynamic_notices: `/* Target the notices section */
& {
  background: #f8f9fa;
  padding: 3rem 0;
}

/* Target notice cards */
& .notice-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Target notice title */
& .notice-title {
  color: #2c3e50;
  font-weight: 600;
}`,
        dynamic_gallery: `/* Target the gallery section */
& {
  background: white;
  padding: 3rem 0;
}

/* Target gallery grid */
& .gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Target gallery images */
& .gallery-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  transition: transform 0.3s;
}

& .gallery-img:hover {
  transform: scale(1.05);
}`
    };

    return templates[section.type] || `/* Target this section */\n& {\n  background: #f5f5f5;\n  color: #333;\n  padding: 2rem;\n}`;
};

export function SectionEditor({ section, onChange }) {
    const [showCssHelp, setShowCssHelp] = useState(false);

    if (!section) {
        return (
            <Card className="h-full w-80 flex-shrink-0 border-l rounded-none">
                <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                    Select a section to edit
                </CardContent>
            </Card>
        );
    }

    const handleChange = (key, value) => {
        onChange({
            ...section,
            data: { ...section.data, [key]: value }
        });
    };

    const handleCssChange = (css) => {
        onChange({
            ...section,
            customCss: css
        });
    };

    const loadTemplate = () => {
        const template = getCssTemplate(section);
        handleCssChange(template);
    };

    return (
        <Card className="h-full w-80 flex-shrink-0 border-l rounded-none overflow-y-auto">
            <CardHeader className="pb-3">
                <CardTitle className="capitalize text-base font-semibold">{section.type} Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Common Fields */}
                <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                        value={section.data.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                    />
                </div>

                {/* Text Alignment */}
                <div className="space-y-2">
                    <Label>Text Alignment</Label>
                    <Select
                        value={section.data.textAlign || 'center'}
                        onValueChange={(value) => handleChange('textAlign', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2 items-center">
                        <Input
                            type="color"
                            value={section.data.bgColor || '#ffffff'}
                            onChange={(e) => handleChange('bgColor', e.target.value)}
                            className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                            type="text"
                            value={section.data.bgColor || ''}
                            onChange={(e) => handleChange('bgColor', e.target.value)}
                            placeholder="e.g. #667eea or transparent"
                            className="flex-1"
                        />
                        {section.data.bgColor && (
                            <button
                                onClick={() => handleChange('bgColor', '')}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">Sets inline style. Leave empty to use default CSS.</p>
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex gap-2 items-center">
                        <Input
                            type="color"
                            value={section.data.textColor || '#000000'}
                            onChange={(e) => handleChange('textColor', e.target.value)}
                            className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                            type="text"
                            value={section.data.textColor || ''}
                            onChange={(e) => handleChange('textColor', e.target.value)}
                            placeholder="e.g. #ffffff or white"
                            className="flex-1"
                        />
                        {section.data.textColor && (
                            <button
                                onClick={() => handleChange('textColor', '')}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">Sets inline style. Leave empty to use default CSS.</p>
                </div>

                {/* Style Preview */}
                {(section.data.bgColor || section.data.textColor) && (
                    <div className="space-y-2">
                        <Label className="text-xs">Preview</Label>
                        <div
                            className="p-4 rounded border"
                            style={{
                                background: section.data.bgColor || '#ffffff',
                                color: section.data.textColor || '#000000'
                            }}
                        >
                            <p className="text-sm font-semibold">Section Preview</p>
                            <p className="text-xs mt-1">This shows your color choices</p>
                        </div>
                    </div>
                )}

                {/* Type Specific Fields */}
                {section.type === 'hero' && (
                    <>
                        <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Input
                                value={section.data.subtitle || ''}
                                onChange={(e) => handleChange('subtitle', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Button Text</Label>
                            <Input
                                value={section.data.ctaText || ''}
                                onChange={(e) => handleChange('ctaText', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Button Link</Label>
                            <Input
                                value={section.data.ctaLink || ''}
                                onChange={(e) => handleChange('ctaLink', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Image</Label>
                            <FileUploadButton
                                field="Hero Image"
                                onChange={(url) => handleChange('image', url)}
                            />
                            {section.data.image && (
                                <img src={section.data.image} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />
                            )}
                        </div>
                    </>
                )}

                {(section.type === 'about' || section.type === 'principal') && (
                    <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                            value={section.data.content || section.data.message || ''}
                            onChange={(e) => handleChange(section.type === 'principal' ? 'message' : 'content', e.target.value)}
                            rows={5}
                        />
                    </div>
                )}

                {section.type === 'principal' && (
                    <div className="space-y-2">
                        <Label>Principal Name</Label>
                        <Input
                            value={section.data.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                        <Label>Image</Label>
                        <FileUploadButton
                            field="Principal Image"
                            onChange={(url) => handleChange('image', url)}
                        />
                        {section.data.image && (
                            <img src={section.data.image} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />
                        )}
                    </div>
                )}

                {section.type === 'contact' && (
                    <>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={section.data.address || ''}
                                onChange={(e) => handleChange('address', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={section.data.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={section.data.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                        </div>
                    </>
                )}

                {/* Dynamic Sections */}
                {(section.type === 'dynamic_notices' || section.type === 'dynamic_gallery') && (
                    <>
                        <div className="space-y-2">
                            <Label>Limit (Number of items)</Label>
                            <Input
                                type="number"
                                value={section.data.limit || (section.type === 'dynamic_notices' ? 3 : 6)}
                                onChange={(e) => handleChange('limit', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>View All Link (Optional)</Label>
                            <Input
                                value={section.data.viewAllLink || ''}
                                onChange={(e) => handleChange('viewAllLink', e.target.value)}
                                placeholder={section.type === 'dynamic_notices' ? '/notices' : '/gallery'}
                            />
                        </div>
                    </>
                )}

                {section.type === 'custom_layout' && (
                    <LayoutEditor
                        data={section.data}
                        onChange={(key, value) => handleChange(key, value)}
                    />
                )}

                {/* Custom CSS Section - Always visible */}
                <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Custom CSS</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadTemplate}
                            className="h-7 text-xs"
                        >
                            Load Template
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded">&</code> for section container.
                        See template for available classes.
                    </p>
                    <div className="border rounded-md overflow-hidden bg-slate-950 text-slate-50 font-mono text-xs">
                        <Editor
                            value={section.customCss || ''}
                            onValueChange={handleCssChange}
                            highlight={code => highlight(code, languages.css)}
                            padding={10}
                            style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                                fontSize: 11,
                                minHeight: '150px',
                            }}
                            textareaClassName="focus:outline-none"
                            placeholder="/* Click 'Load Template' to see available classes */"
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
