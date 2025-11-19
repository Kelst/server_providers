'use client';

import { useEffect, useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCabinetIntelektStore } from '@/lib/stores/cabinetIntelektStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Upload, Trash2, Plus, Edit, Building2, Phone, Mail, Share2, History } from 'lucide-react';
import { format } from 'date-fns';

// Backend base URL for static files
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function CabinetIntelektPage() {
  const {
    providerInfo,
    auditLogs,
    isLoading,
    fetchProviderInfo,
    createProviderInfo,
    updateProviderInfo,
    uploadLogo,
    deleteLogo,
    createPhone,
    updatePhone,
    deletePhone,
    createEmail,
    updateEmail,
    deleteEmail,
    createSocialMedia,
    updateSocialMedia,
    deleteSocialMedia,
    fetchAuditLogs,
  } = useCabinetIntelektStore();
  const { toast } = useToast();

  // General Info State
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [telegramBot, setTelegramBot] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressPostal, setAddressPostal] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone Modal State
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLabel, setPhoneLabel] = useState('');
  const [phoneIsPrimary, setPhoneIsPrimary] = useState(false);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<any>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLabel, setEmailLabel] = useState('');
  const [emailIsPrimary, setEmailIsPrimary] = useState(false);

  // Social Media Modal State
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<any>(null);
  const [socialPlatform, setSocialPlatform] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [socialLabel, setSocialLabel] = useState('');

  useEffect(() => {
    fetchProviderInfo();
  }, [fetchProviderInfo]);

  useEffect(() => {
    if (providerInfo) {
      setCompanyName(providerInfo.companyName);
      setDescription(providerInfo.description || '');
      setWebsite(providerInfo.website || '');
      setTelegramBot(providerInfo.telegramBot || '');
      setWorkingHours(providerInfo.workingHours || '');
      setAddressStreet(providerInfo.addressStreet || '');
      setAddressCity(providerInfo.addressCity || '');
      setAddressPostal(providerInfo.addressPostal || '');
      setAddressCountry(providerInfo.addressCountry || '');
      setLogoPreview(providerInfo.logoUrl || null);
    }
  }, [providerInfo]);

  const handleSaveGeneralInfo = async () => {
    try {
      const data = {
        companyName,
        description: description || undefined,
        website: website || undefined,
        telegramBot: telegramBot || undefined,
        workingHours: workingHours || undefined,
        addressStreet: addressStreet || undefined,
        addressCity: addressCity || undefined,
        addressPostal: addressPostal || undefined,
        addressCountry: addressCountry || undefined,
      };

      if (providerInfo) {
        await updateProviderInfo(data);
        toast({
          title: 'Information updated',
          description: 'Provider information has been updated successfully',
        });
      } else {
        await createProviderInfo(data);
        toast({
          title: 'Information created',
          description: 'Provider information has been created successfully',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save provider information',
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    try {
      await uploadLogo(logoFile);
      toast({
        title: 'Logo uploaded',
        description: 'Logo has been uploaded successfully',
      });
      setLogoFile(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload logo',
      });
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await deleteLogo();
      toast({
        title: 'Logo deleted',
        description: 'Logo has been removed successfully',
      });
      setLogoPreview(null);
      setLogoFile(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete logo',
      });
    }
  };

  // Phone CRUD handlers
  const handleOpenPhoneModal = (phone?: any) => {
    if (phone) {
      setEditingPhone(phone);
      setPhoneNumber(phone.phoneNumber);
      setPhoneLabel(phone.label || '');
      setPhoneIsPrimary(phone.isPrimary);
    } else {
      setEditingPhone(null);
      setPhoneNumber('');
      setPhoneLabel('');
      setPhoneIsPrimary(false);
    }
    setPhoneModalOpen(true);
  };

  const handleSavePhone = async () => {
    try {
      const data = {
        phoneNumber,
        label: phoneLabel || undefined,
        isPrimary: phoneIsPrimary,
      };

      if (editingPhone) {
        await updatePhone(editingPhone.id, data);
        toast({
          title: 'Phone updated',
          description: 'Phone number has been updated successfully',
        });
      } else {
        await createPhone(data);
        toast({
          title: 'Phone added',
          description: 'Phone number has been added successfully',
        });
      }
      setPhoneModalOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save phone number',
      });
    }
  };

  const handleDeletePhone = async (id: string) => {
    try {
      await deletePhone(id);
      toast({
        title: 'Phone deleted',
        description: 'Phone number has been removed successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete phone number',
      });
    }
  };

  // Email CRUD handlers
  const handleOpenEmailModal = (email?: any) => {
    if (email) {
      setEditingEmail(email);
      setEmailAddress(email.email);
      setEmailLabel(email.label || '');
      setEmailIsPrimary(email.isPrimary);
    } else {
      setEditingEmail(null);
      setEmailAddress('');
      setEmailLabel('');
      setEmailIsPrimary(false);
    }
    setEmailModalOpen(true);
  };

  const handleSaveEmail = async () => {
    try {
      const data = {
        email: emailAddress,
        label: emailLabel || undefined,
        isPrimary: emailIsPrimary,
      };

      if (editingEmail) {
        await updateEmail(editingEmail.id, data);
        toast({
          title: 'Email updated',
          description: 'Email address has been updated successfully',
        });
      } else {
        await createEmail(data);
        toast({
          title: 'Email added',
          description: 'Email address has been added successfully',
        });
      }
      setEmailModalOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save email address',
      });
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      await deleteEmail(id);
      toast({
        title: 'Email deleted',
        description: 'Email address has been removed successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete email address',
      });
    }
  };

  // Social Media CRUD handlers
  const handleOpenSocialModal = (social?: any) => {
    if (social) {
      setEditingSocial(social);
      setSocialPlatform(social.platform);
      setSocialUrl(social.url);
      setSocialLabel(social.label || '');
    } else {
      setEditingSocial(null);
      setSocialPlatform('');
      setSocialUrl('');
      setSocialLabel('');
    }
    setSocialModalOpen(true);
  };

  const handleSaveSocial = async () => {
    try {
      const data = {
        platform: socialPlatform,
        url: socialUrl,
        label: socialLabel || undefined,
      };

      if (editingSocial) {
        await updateSocialMedia(editingSocial.id, data);
        toast({
          title: 'Social media updated',
          description: 'Social media link has been updated successfully',
        });
      } else {
        await createSocialMedia(data);
        toast({
          title: 'Social media added',
          description: 'Social media link has been added successfully',
        });
      }
      setSocialModalOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save social media link',
      });
    }
  };

  const handleDeleteSocial = async (id: string) => {
    try {
      await deleteSocialMedia(id);
      toast({
        title: 'Social media deleted',
        description: 'Social media link has been removed successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete social media link',
      });
    }
  };

  const handleLoadAuditLogs = () => {
    fetchAuditLogs(100);
  };

  if (isLoading && !providerInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Cabinet Intelekt" description="Manage provider information" />

      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <Building2 className="h-4 w-4 mr-2" />
              General Info
            </TabsTrigger>
            <TabsTrigger value="phones">
              <Phone className="h-4 w-4 mr-2" />
              Phones
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="h-4 w-4 mr-2" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="h-4 w-4 mr-2" />
              Social Media
            </TabsTrigger>
            <TabsTrigger value="audit" onClick={handleLoadAuditLogs}>
              <History className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* General Info Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic information about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Section */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                        <img
                          src={`${BACKEND_BASE_URL}${logoPreview}`}
                          alt="Company logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                      {logoFile && (
                        <Button onClick={handleUploadLogo} disabled={isLoading}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Upload Logo
                        </Button>
                      )}
                      {logoPreview && (
                        <Button
                          variant="destructive"
                          onClick={handleDeleteLogo}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Logo
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or JPEG (max 5MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your company"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegramBot">Telegram Bot</Label>
                    <Input
                      id="telegramBot"
                      value={telegramBot}
                      onChange={(e) => setTelegramBot(e.target.value)}
                      placeholder="@your_bot"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHours">Working Hours</Label>
                  <Input
                    id="workingHours"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="Mon-Fri 9:00-18:00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Office Address</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="Street address"
                    />
                    <Input
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={addressPostal}
                      onChange={(e) => setAddressPostal(e.target.value)}
                      placeholder="Postal code"
                    />
                    <Input
                      value={addressCountry}
                      onChange={(e) => setAddressCountry(e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveGeneralInfo} disabled={isLoading || !companyName}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Information
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phones Tab */}
          <TabsContent value="phones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Phone Numbers</CardTitle>
                    <CardDescription>
                      Manage contact phone numbers
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenPhoneModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Phone
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {providerInfo?.phones && providerInfo.phones.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerInfo.phones.map((phone) => (
                        <TableRow key={phone.id}>
                          <TableCell className="font-mono">{phone.phoneNumber}</TableCell>
                          <TableCell>{phone.label || '-'}</TableCell>
                          <TableCell>
                            {phone.isPrimary && <Badge>Primary</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPhoneModal(phone)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePhone(phone.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No phone numbers added yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Phone Modal */}
            {phoneModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>{editingPhone ? 'Edit' : 'Add'} Phone Number</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneLabel">Label</Label>
                      <Input
                        id="phoneLabel"
                        value={phoneLabel}
                        onChange={(e) => setPhoneLabel(e.target.value)}
                        placeholder="Office, Mobile, etc."
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="phoneIsPrimary"
                        checked={phoneIsPrimary}
                        onChange={(e) => setPhoneIsPrimary(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="phoneIsPrimary">Set as primary</Label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setPhoneModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSavePhone} disabled={!phoneNumber}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Addresses</CardTitle>
                    <CardDescription>
                      Manage contact email addresses
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenEmailModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {providerInfo?.emails && providerInfo.emails.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerInfo.emails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-mono">{email.email}</TableCell>
                          <TableCell>{email.label || '-'}</TableCell>
                          <TableCell>
                            {email.isPrimary && <Badge>Primary</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEmailModal(email)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteEmail(email.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No email addresses added yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Email Modal */}
            {emailModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>{editingEmail ? 'Edit' : 'Add'} Email Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailAddress">Email Address *</Label>
                      <Input
                        id="emailAddress"
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailLabel">Label</Label>
                      <Input
                        id="emailLabel"
                        value={emailLabel}
                        onChange={(e) => setEmailLabel(e.target.value)}
                        placeholder="Support, Sales, etc."
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="emailIsPrimary"
                        checked={emailIsPrimary}
                        onChange={(e) => setEmailIsPrimary(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="emailIsPrimary">Set as primary</Label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setEmailModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEmail} disabled={!emailAddress}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Social Media</CardTitle>
                    <CardDescription>
                      Manage social media links
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenSocialModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Social Media
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {providerInfo?.socialMedia && providerInfo.socialMedia.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerInfo.socialMedia.map((social) => (
                        <TableRow key={social.id}>
                          <TableCell>{social.platform}</TableCell>
                          <TableCell className="font-mono text-sm">{social.url}</TableCell>
                          <TableCell>{social.label || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSocialModal(social)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSocial(social.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No social media links added yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Social Media Modal */}
            {socialModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>{editingSocial ? 'Edit' : 'Add'} Social Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="socialPlatform">Platform *</Label>
                      <Input
                        id="socialPlatform"
                        value={socialPlatform}
                        onChange={(e) => setSocialPlatform(e.target.value)}
                        placeholder="Facebook, Twitter, Instagram, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialUrl">URL *</Label>
                      <Input
                        id="socialUrl"
                        value={socialUrl}
                        onChange={(e) => setSocialUrl(e.target.value)}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialLabel">Label</Label>
                      <Input
                        id="socialLabel"
                        value={socialLabel}
                        onChange={(e) => setSocialLabel(e.target.value)}
                        placeholder="Optional label"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setSocialModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSocial} disabled={!socialPlatform || !socialUrl}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  History of changes to provider information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs && auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge>{log.action}</Badge>
                          </TableCell>
                          <TableCell>
                            {log.admin
                              ? `${log.admin.firstName} ${log.admin.lastName}`
                              : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <pre className="text-xs max-w-md overflow-auto">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), 'PPp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No audit logs available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
