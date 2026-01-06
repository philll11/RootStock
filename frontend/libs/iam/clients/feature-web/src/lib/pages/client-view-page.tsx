import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useDeleteClient,
  useGetClient
} from '@rootstock/iam/clients/clients-data-access';
import { ClientForm } from '../client-form';
import { PageHeader, ConfirmModal, useContextualNavigation, SubResourceTabs } from '@rootstock/ui/web';
import { Container, Paper, Alert, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle, IconTrash, IconHistory } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { AuditTable } from '@rootstock/system/audit/audit-feature-web';

export function ClientViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: deleteClient } = useDeleteClient();
  const { data: client, isLoading } = useGetClient(id);
  const { getLinkTo, goBack } = useContextualNavigation('/clients');
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo('edit', { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteClient(id);
        goBack();
      } catch (error) {
        console.error('Failed to delete client', error);
      }
    }
  };
  
  const handleCancel = () => {
    goBack();
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!client) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Client not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader
        title={client.name}
        action={
          can(PERMISSIONS.CLIENT_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.icons.delete}
              onClick={openDeleteModal}
              title="Delete Client"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder>
        <ClientForm
          mode="view"
          client={client}
          onSubmit={() => { }}
          isLoading={false}
            onCancel={handleCancel}
            onEdit={can(PERMISSIONS.CLIENT_EDIT) ? handleEdit : undefined}
          fullHeight={false}
        />
      </Paper>
      
      <SubResourceTabs
        title="Details"
        tabs={[
          ...(can(PERMISSIONS.AUDIT_VIEW) ? [{
            value: 'audit',
            label: 'Audit Trail',
            icon: <IconHistory size={iconSizes.sm} />,
            content: <AuditTable resource="Client" recordId={id!} />,
          }] : []),
        ]}
      />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete client "${client?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.icons.delete}
      />
    </Container>
  );
}
