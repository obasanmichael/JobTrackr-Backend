import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { ApiTokenGuard } from '../api-tokens/api-token.guard';
import type { CurrentUser } from '../common/types/current-user.type';
import { McpServerFactory } from './mcp-server.factory';

const METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
};

/**
 * Stateless Streamable HTTP endpoint: a fresh server + transport per request,
 * bound to the user that owns the API token.
 */
@ApiExcludeController()
@ApiBearerAuth('access-token')
@UseGuards(ApiTokenGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly serverFactory: McpServerFactory) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request & { user: CurrentUser },
    @Res() res: Response,
  ): Promise<void> {
    const server = this.serverFactory.create(req.user);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  @Get()
  notAllowedGet(@Res() res: Response): void {
    res.status(HttpStatus.METHOD_NOT_ALLOWED).json(METHOD_NOT_ALLOWED);
  }

  @Delete()
  notAllowedDelete(@Res() res: Response): void {
    res.status(HttpStatus.METHOD_NOT_ALLOWED).json(METHOD_NOT_ALLOWED);
  }
}
