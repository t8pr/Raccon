import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../shared/constants/queryKeys";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import Pagination from "./components/Pagination/Pagination";
import { useAuth } from "../../shared/auth/AuthContext";
import FilterBar from "../../shared/ui/FilterBar/FilterBar";
import ConfirmDialog from "../../shared/ui/ConfirmDialog/ConfirmDialog";
import InlineMessage from "../../shared/ui/InlineMessage/InlineMessage";
import "./AdminExperiences.css";
import "./UserManagementPage.css";

import { deleteUser, getUsers } from "./api";


export default function UserManagementPage() {
    const { t } = useTranslation();
    const roleFilters = [
      { value: "all", label: t("common.all") },
      { value: "user", label: t("admin.users.regularUsers") },
      { value: "admin", label: t("admin.users.admins") },
    ];

    const [page, setPage] = useState(1);
    const [role, setRole] = useState("all");
    const [userToDelete, setUserToDelete] = useState(null);

    const perPage = 10;
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: async () => {
            setUserToDelete(null);
            setPage(1);
            await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
        },
    });

    const UsersQuery = useQuery({
        queryKey: [...queryKeys.adminUsers(), "full-list"],
        enabled: Boolean(accessToken),
        queryFn: async () => {
            const first = await getUsers({ page: 1, size: perPage });
            const users = [...first.items];

            for (let nextPage = 2; nextPage <= first.pages; nextPage += 1) {
                const next = await getUsers({ page: nextPage, size: perPage });
                users.push(...next.items);
            }

            return users;
        },
        });


    const users = UsersQuery.data ?? [];
    const matchingUsers = role === "all" ? users : users.filter((user) => user.role === role);
    const total = matchingUsers.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const visibleUsers = matchingUsers.slice(start, start + perPage);

    return (
        <div className="usr-mngmnt">
        <AppNavbar />

        <main className="admin-exp" aria-labelledby="usr-mngmt-title">
          <h1 id="usr-mngmt-title">{t("admin.users.title")}</h1>

          <p>{t("admin.users.count", { count: total })} </p>

          <ConfirmDialog
            open={Boolean(userToDelete)}
            title={t("admin.users.deleteTitle")}
            description={t("admin.users.deleteDescription", { name: userToDelete?.name ?? "" })}
            pending={deleteUserMutation.isPending}
            onConfirm={() => deleteUserMutation.mutate({ user_id: userToDelete.id })}
            onCancel={() => {
              setUserToDelete(null);
              deleteUserMutation.reset();
            }}
          >
            {deleteUserMutation.isError && (
              <InlineMessage type="error" message={t("admin.users.deleteFailed")} />
            )}
          </ConfirmDialog>

          <FilterBar
            filters={roleFilters}
            value={role}
            onChange={(nextRole) => {
              setRole(nextRole);
              setPage(1);
            }}
            label={t("admin.users.filter")}
          />

        <div className="users-table-wrap">
        {UsersQuery.isPending ? (
        <p className="users-table__state" role="status">{t("admin.users.loading")}</p>
        ) : UsersQuery.isError ? (
        <div className="users-table__state">
          <InlineMessage type="error" message={t("admin.users.loadFailed")} />
        </div>
        ) : visibleUsers.length === 0 ? (
        <p className="users-table__state">{t("admin.users.empty")}</p>
        ) : (
        <table className="users-table">
            <thead>
            <tr>
                <th scope="col">{t("admin.users.name")}</th>
                <th scope="col">{t("admin.users.username")}</th>
                <th scope="col">{t("admin.users.email")}</th>
                <th scope="col">{t("admin.users.phone")}</th>
                <th scope="col">{t("admin.users.role")}</th>
                <th scope="col">{t("admin.users.actions")}</th>
            </tr>
            </thead>
            <tbody>
            {visibleUsers.map((user) => (
                <tr key={user.id}>
                <th scope="row">{user.name}</th>
                <td><bdi>{user.username}</bdi></td>
                <td><bdi>{user.email}</bdi></td>
                <td><bdi>{user.phone_number}</bdi></td>
                <td>
                <span
                    className={`users-table__role ${
                    user.role === "admin" ? "users-table__role--admin" : "users-table__role--user"
                    }`}
                >
                    {t(user.role === "admin" ? "admin.users.admin" : "admin.users.user")}
                </span>
                </td>
                <td>
                    <button
                    type="button"
                    className="users-table__delete"
                    aria-label={t("admin.users.deleteLabel", { name: user.name })}
                    disabled={deleteUserMutation.isPending}
                    onClick={() => {
                      deleteUserMutation.reset();
                      setUserToDelete(user);
                    }}
                    >
                    <Trash2 size={16} aria-hidden="true" />
                    </button>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        )}
        </div>

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        )}
        </main>
        </div>
    );
}
