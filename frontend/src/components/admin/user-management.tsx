import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    getListUsersApiAuthUsersGetQueryKey,
    useCreateUserApiAuthUsersPost,
    useDeleteUserApiAuthUsersUserIdDelete,
    useListUsersApiAuthUsersGet,
    useUpdateUserApiAuthUsersUserIdPatch,
} from "@/api/generated/auth/auth";
import type { UserRead, UserUpdate } from "@/api/generated/contWatchAPI.schemas";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/providers/auth-provider";

const MIN_PASSWORD_LENGTH = 8;

export function UserManagement() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const { data } = useListUsersApiAuthUsersGet();
    const deleteUser = useDeleteUserApiAuthUsersUserIdDelete();
    const [editingUser, setEditingUser] = useState<UserRead | null>(null);
    const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRead | null>(null);

    const users = (data?.data ?? []) as UserRead[];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight">{t("admin.title")}</h2>
                <AddUserDialog />
            </div>

            {users.length === 0 ? (
                <EmptyState icon={Shield} title={t("admin.noUsers")} />
            ) : (
                <Card className="!py-0 !gap-0 divide-y">
                    {users.map((user) => (
                        <CardContent
                            key={user.id}
                            className="flex items-center justify-between gap-4 px-4 py-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">{user.username}</p>
                                    <Badge
                                        variant={user.role === "admin" ? "default" : "secondary"}
                                        className="text-[10px]"
                                    >
                                        {user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleUser")}
                                    </Badge>
                                    {!user.is_active && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            {t("admin.inactive")}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => setEditingUser(user)}
                                    title={t("admin.editUser")}
                                >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => setPendingDeleteUser(user)}
                                    disabled={currentUser?.id === user.id}
                                    title={
                                        currentUser?.id === user.id
                                            ? t("admin.cannotDeleteSelf")
                                            : t("admin.deleteUser")
                                    }
                                    className="text-muted-foreground hover:text-destructive-foreground"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    ))}
                </Card>
            )}

            <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
            <ConfirmDialog
                open={pendingDeleteUser !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteUser(null);
                }}
                onConfirm={() => {
                    if (!pendingDeleteUser) return;
                    deleteUser.mutate(
                        { userId: pendingDeleteUser.id },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: getListUsersApiAuthUsersGetQueryKey(),
                                });
                                toast.success(t("toast.userDeleted"));
                            },
                        },
                    );
                }}
                description={t("confirm.deleteUser")}
            />
        </div>
    );
}

function AddUserDialog() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const createUser = useCreateUserApiAuthUsersPost();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!username || !email || !password) return;
        createUser.mutate(
            { data: { username, email, password, role } },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListUsersApiAuthUsersGetQueryKey(),
                    });
                    setOpen(false);
                    setUsername("");
                    setEmail("");
                    setPassword("");
                    setRole("user");
                    toast.success(t("toast.userCreated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {t("admin.addUser")}
                    </Button>
                }
            />
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("admin.createUser")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("admin.username")}</Label>
                            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.email")}</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.password")}</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={MIN_PASSWORD_LENGTH}
                                required
                            />
                            {password && password.length < MIN_PASSWORD_LENGTH && (
                                <p className="text-xs text-destructive">
                                    {t("admin.passwordMinLength", { count: MIN_PASSWORD_LENGTH })}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.role")}</Label>
                            <Select value={role} onValueChange={(v) => v && setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    <SelectItem value="user">{t("admin.roleUser")}</SelectItem>
                                    <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={!username || !email || !password || createUser.isPending}
                        >
                            {t("admin.createUser")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditUserDialog({ user, onClose }: { user: UserRead | null; onClose: () => void }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [password, setPassword] = useState("");
    const updateUser = useUpdateUserApiAuthUsersUserIdPatch();

    const open = user !== null;

    function handleOpenChange(next: boolean) {
        if (!next) onClose();
    }

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            setRole(user.role);
            setIsActive(user.is_active);
            setPassword("");
        }
    }, [user]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        const data: UserUpdate = {};
        if (email !== user.email) data.email = email;
        if (role !== user.role) data.role = role;
        if (isActive !== user.is_active) data.is_active = isActive;
        if (password) data.password = password;

        updateUser.mutate(
            { userId: user.id, data },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListUsersApiAuthUsersGetQueryKey(),
                    });
                    onClose();
                    toast.success(t("toast.userUpdated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("admin.editUser")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("admin.email")}</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.role")}</Label>
                            <Select value={role} onValueChange={(v) => v && setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    <SelectItem value="user">{t("admin.roleUser")}</SelectItem>
                                    <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t("admin.active")}</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.password")}</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={MIN_PASSWORD_LENGTH}
                            />
                            {password && password.length < MIN_PASSWORD_LENGTH ? (
                                <p className="text-xs text-destructive">
                                    {t("admin.passwordMinLength", { count: MIN_PASSWORD_LENGTH })}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{t("admin.passwordHint")}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={updateUser.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
