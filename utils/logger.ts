import { supabase } from '../lib/supabase';

/**
 * Logs a deletion action in the database.
 * @param tableName The name of the table from which the record was deleted.
 * @param recordId The unique identifier of the deleted record.
 * @param recordDescription Human-readable description/details of the deleted record.
 */
export async function logDeletion(
    tableName: string,
    recordId: string,
    recordDescription: string
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.email || 'Sistema';

        const { error } = await supabase
            .from('deletion_logs')
            .insert([{
                table_name: tableName,
                record_id: recordId,
                record_description: recordDescription,
                deleted_by: userName
            }]);

        if (error) {
            console.error('Falha ao registrar log de exclusão:', error.message);
        } else {
            console.log(`Exclusão registrada com sucesso: ${tableName} - ${recordDescription}`);
        }
    } catch (err) {
        console.error('Erro na gravação de logs de exclusão:', err);
    }
}
