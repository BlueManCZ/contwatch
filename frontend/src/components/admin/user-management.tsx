import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useCreateUserApiAuthUsersPost,
    useDeleteUserApiAuthUsersUserIdDelete,
    useListUsersApiAuthUsersGet,
    useUpdateUserApiAuthUsersUserIdPatch,
} from "@/api/generated/auth/auth";
import type { UserRead, UserUpdate } from "@/api/generated/contWatchAPI.schemas";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";

export function UserManagement() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const { data } = useListUsersApiAuthUsersGet();
    const deleteUser = useDeleteUserApiAuthUsersUserIdDelete();
    const [editingUser, setEditingUser] = useState<UserRead | null>(null);

    const users = (data?.data ?? []) as UserRead[];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
                <AddUserDialog />
            </div>

            {users.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">{t("admin.noUsers")}</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("admin.username")}</TableHead>
                                <TableHead>{t("admin.email")}</TableHead>
                                <TableHead>{t("admin.role")}</TableHead>
                                <TableHead>{t("admin.active")}</TableHead>
                                <TableHead className="w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                            {user.role === "admin"
                                                ? t("admin.roleAdmin")
                                                : t("admin.roleUser")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_active ? "default" : "destructive"}>
                                            {user.is_active ? t("admin.active") : t("admin.inactive")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setEditingUser(user)}
                                                title={t("admin.editUser")}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    deleteUser.mutate(
                                                        { userId: user.id },
                                                        {
                                                            onSuccess: () =>
                                                                toast.success(t("toast.userDeleted")),
                                                        },
                                                    )
                                                }
                                                disabled={currentUser?.id === user.id}
                                                title={
                                                    currentUser?.id === user.id
                                                        ? t("admin.cannotDeleteSelf")
                                                        : t("admin.deleteUser")
                                                }
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
        </div>
    );
}

function AddUserDialog() {
    const { t } = useTranslation();
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
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
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
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("admin.role")}</Label>
                            <Select value={role} onValueChange={(v) => v && setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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
                                <SelectContent>
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
                            />
                            <p className="text-xs text-muted-foreground">{t("admin.passwordHint")}</p>
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
