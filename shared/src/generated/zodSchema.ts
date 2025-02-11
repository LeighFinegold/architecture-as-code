import { z } from 'zod';

export const core = z.object({
    nodes: z
        .array(
            z
                .object({
                    'unique-id': z.string(),
                    'node-type': z.enum([
                        'actor',
                        'ecosystem',
                        'system',
                        'service',
                        'database',
                        'network',
                        'ldap',
                        'webclient',
                        'data-assset',
                    ]),
                    name: z.string(),
                    description: z.string(),
                    details: z
                        .object({
                            'detailed-architecture': z.string().optional(),
                            'required-pattern': z.string().optional(),
                        })
                        .strict()
                        .optional(),
                    'data-classification': z
                        .enum([
                            'Public',
                            'Confidential',
                            'Highly Restricted',
                            'MNPI',
                            'PII',
                        ])
                        .optional(),
                    'run-as': z.string().optional(),
                    instance: z.string().optional(),
                    interfaces: z
                        .array(z.object({ 'unique-id': z.string() }))
                        .optional(),
                    controls: z
                        .record(
                            z.object({
                                description: z
                                    .string()
                                    .describe(
                                        'A description of a control and how it applies to a given architecture',
                                    ),
                                requirements: z.array(
                                    z.object({
                                        'control-requirement-url': z
                                            .string()
                                            .describe(
                                                'The requirement schema that specifies how a control should be defined',
                                            ),
                                        'control-config-url': z
                                            .string()
                                            .describe(
                                                'The configuration of how the control requirement schema is met',
                                            )
                                            .optional(),
                                    }),
                                ),
                            }),
                        )
                        .superRefine((value, ctx) => {
                            for (const key in value) {
                                if (key.match(new RegExp('^[a-zA-Z0-9-]+$'))) {
                                    const result = z
                                        .object({
                                            description: z
                                                .string()
                                                .describe(
                                                    'A description of a control and how it applies to a given architecture',
                                                ),
                                            requirements: z.array(
                                                z.object({
                                                    'control-requirement-url': z
                                                        .string()
                                                        .describe(
                                                            'The requirement schema that specifies how a control should be defined',
                                                        ),
                                                    'control-config-url': z
                                                        .string()
                                                        .describe(
                                                            'The configuration of how the control requirement schema is met',
                                                        )
                                                        .optional(),
                                                }),
                                            ),
                                        })
                                        .safeParse(value[key]);
                                    if (!result.success) {
                                        ctx.addIssue({
                                            path: [...ctx.path, key],
                                            code: 'custom',
                                            message: `Invalid input: Key matching regex /${key}/ must match schema`,
                                            params: {
                                                issues: result.error.issues,
                                            },
                                        });
                                    }
                                }
                            }
                        })
                        .optional(),
                    metadata: z.array(z.record(z.any())).optional(),
                })
                .strict(),
        )
        .optional(),
    relationships: z
        .array(
            z
                .object({
                    'unique-id': z.string(),
                    description: z.string().optional(),
                    'relationship-type': z
                        .object({
                            interacts: z
                                .object({
                                    actor: z.string(),
                                    nodes: z.array(z.string()).min(1),
                                })
                                .optional(),
                            connects: z
                                .object({
                                    source: z.object({
                                        node: z.string(),
                                        interfaces: z
                                            .array(z.string())
                                            .optional(),
                                    }),
                                    destination: z.object({
                                        node: z.string(),
                                        interfaces: z
                                            .array(z.string())
                                            .optional(),
                                    }),
                                })
                                .optional(),
                            'deployed-in': z
                                .object({
                                    container: z.string().optional(),
                                    nodes: z
                                        .array(z.string())
                                        .min(1)
                                        .optional(),
                                })
                                .optional(),
                            'composed-of': z
                                .object({
                                    container: z.string(),
                                    nodes: z.array(z.string()).min(1),
                                })
                                .optional(),
                        })
                        .and(
                            z.any().superRefine((x, ctx) => {
                                const schemas = [
                                    z.any(),
                                    z.any(),
                                    z.any(),
                                    z.any(),
                                ];
                                const errors = schemas.reduce<z.ZodError[]>(
                                    (errors, schema) =>
                                        ((result) =>
                                            result.error
                                                ? [...errors, result.error]
                                                : errors)(schema.safeParse(x)),
                                    [],
                                );
                                if (schemas.length - errors.length !== 1) {
                                    ctx.addIssue({
                                        path: ctx.path,
                                        code: 'invalid_union',
                                        unionErrors: errors,
                                        message:
                                            'Invalid input: Should pass single schema',
                                    });
                                }
                            }),
                        ),
                    protocol: z
                        .enum([
                            'HTTP',
                            'HTTPS',
                            'FTP',
                            'SFTP',
                            'JDBC',
                            'WebSocket',
                            'SocketIO',
                            'LDAP',
                            'AMQP',
                            'TLS',
                            'mTLS',
                            'TCP',
                        ])
                        .optional(),
                    authentication: z
                        .enum([
                            'Basic',
                            'OAuth2',
                            'Kerberos',
                            'SPNEGO',
                            'Certificate',
                        ])
                        .optional(),
                    metadata: z.array(z.record(z.any())).optional(),
                    controls: z
                        .record(
                            z.object({
                                description: z
                                    .string()
                                    .describe(
                                        'A description of a control and how it applies to a given architecture',
                                    ),
                                requirements: z.array(
                                    z.object({
                                        'control-requirement-url': z
                                            .string()
                                            .describe(
                                                'The requirement schema that specifies how a control should be defined',
                                            ),
                                        'control-config-url': z
                                            .string()
                                            .describe(
                                                'The configuration of how the control requirement schema is met',
                                            )
                                            .optional(),
                                    }),
                                ),
                            }),
                        )
                        .superRefine((value, ctx) => {
                            for (const key in value) {
                                if (key.match(new RegExp('^[a-zA-Z0-9-]+$'))) {
                                    const result = z
                                        .object({
                                            description: z
                                                .string()
                                                .describe(
                                                    'A description of a control and how it applies to a given architecture',
                                                ),
                                            requirements: z.array(
                                                z.object({
                                                    'control-requirement-url': z
                                                        .string()
                                                        .describe(
                                                            'The requirement schema that specifies how a control should be defined',
                                                        ),
                                                    'control-config-url': z
                                                        .string()
                                                        .describe(
                                                            'The configuration of how the control requirement schema is met',
                                                        )
                                                        .optional(),
                                                }),
                                            ),
                                        })
                                        .safeParse(value[key]);
                                    if (!result.success) {
                                        ctx.addIssue({
                                            path: [...ctx.path, key],
                                            code: 'custom',
                                            message: `Invalid input: Key matching regex /${key}/ must match schema`,
                                            params: {
                                                issues: result.error.issues,
                                            },
                                        });
                                    }
                                }
                            }
                        })
                        .optional(),
                })
                .strict(),
        )
        .optional(),
    metadata: z.array(z.record(z.any())).optional(),
    controls: z
        .record(
            z.object({
                description: z
                    .string()
                    .describe(
                        'A description of a control and how it applies to a given architecture',
                    ),
                requirements: z.array(
                    z.object({
                        'control-requirement-url': z
                            .string()
                            .describe(
                                'The requirement schema that specifies how a control should be defined',
                            ),
                        'control-config-url': z
                            .string()
                            .describe(
                                'The configuration of how the control requirement schema is met',
                            )
                            .optional(),
                    }),
                ),
            }),
        )
        .superRefine((value, ctx) => {
            for (const key in value) {
                if (key.match(new RegExp('^[a-zA-Z0-9-]+$'))) {
                    const result = z
                        .object({
                            description: z
                                .string()
                                .describe(
                                    'A description of a control and how it applies to a given architecture',
                                ),
                            requirements: z.array(
                                z.object({
                                    'control-requirement-url': z
                                        .string()
                                        .describe(
                                            'The requirement schema that specifies how a control should be defined',
                                        ),
                                    'control-config-url': z
                                        .string()
                                        .describe(
                                            'The configuration of how the control requirement schema is met',
                                        )
                                        .optional(),
                                }),
                            ),
                        })
                        .safeParse(value[key]);
                    if (!result.success) {
                        ctx.addIssue({
                            path: [...ctx.path, key],
                            code: 'custom',
                            message: `Invalid input: Key matching regex /${key}/ must match schema`,
                            params: {
                                issues: result.error.issues,
                            },
                        });
                    }
                }
            }
        })
        .optional(),
    flows: z
        .array(
            z.object({
                'unique-id': z
                    .string()
                    .describe('Unique identifier for the flow'),
                name: z
                    .string()
                    .describe('Descriptive name for the business flow'),
                description: z
                    .string()
                    .describe("Detailed description of the flow's purpose"),
                'requirement-url': z
                    .string()
                    .describe('Link to a detailed requirement document')
                    .optional(),
                transitions: z.array(
                    z.object({
                        'relationship-unique-id': z
                            .string()
                            .describe(
                                'Unique identifier for the relationship in the architecture',
                            )
                            .optional(),
                        'sequence-number': z
                            .number()
                            .int()
                            .describe(
                                'Indicates the sequence of the relationship in the flow',
                            )
                            .optional(),
                        summary: z
                            .string()
                            .describe(
                                'Functional summary of what is happening in the transition',
                            )
                            .optional(),
                        direction: z
                            .enum([
                                'source-to-destination',
                                'destination-to-source',
                            ])
                            .default('source-to-destination'),
                        required: z.any().optional(),
                    }),
                ),
                metadata: z.array(z.record(z.any())).optional(),
            }),
        )
        .optional(),
});
export type Core = z.infer<typeof core>;
