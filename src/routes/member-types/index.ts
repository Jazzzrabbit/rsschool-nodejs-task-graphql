import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { changeMemberTypeBodySchema } from './schema';
import type { MemberTypeEntity } from '../../utils/DB/entities/DBMemberTypes';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<MemberTypeEntity[]> {
    const result = await fastify.db.memberTypes.findMany();
    return reply.send(result);
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      const { id } = request.params;
      const result = await fastify.db.memberTypes.findOne({ key: 'id', equals: id });
      return reply.status(404).send(result);
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeMemberTypeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      const { id } = request.params;
      const { body } = request;

      try {
        const result = await fastify.db.memberTypes.change(id, body);
        return reply.send(result);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );
};

export default plugin;
