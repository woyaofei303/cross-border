import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { PgOutboxRepository } from "../database/pg/pg-outbox.repository.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminPaymentController } from "./controllers/admin-payment.controller.js";
import { PaymentController } from "./controllers/payment.controller.js";
import { PaymentWorkflowService } from "./payment.service.js";
import { PgPaymentRepository } from "./repositories/pg-payment.repository.js";
import {
	CreatePaymentOrderUseCase,
	ListAdminPaymentOrdersUseCase,
	ListAdminPaymentTransactionsUseCase,
	ListAdminPaymentWebhooksUseCase,
	ProcessPaymentWebhookUseCase,
	ReceivePaymentWebhookUseCase,
} from "./payment.use-cases.js";
import { PaymentWebhookSignatureService } from "./webhook/payment-webhook-signature.service.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule],
	controllers: [PaymentController, AdminPaymentController],
	providers: [
		PaymentWorkflowService,
		PgPaymentRepository,
		PaymentWebhookSignatureService,
		{
			provide: CreatePaymentOrderUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
				outbox: PgOutboxRepository,
				paymentWorkflow: PaymentWorkflowService,
			) =>
				new CreatePaymentOrderUseCase({
					transactions,
					payments,
					outbox,
					paymentWorkflow,
				}),
			inject: [
				PgTransactionManager,
				PgPaymentRepository,
				PgOutboxRepository,
				PaymentWorkflowService,
			],
		},
		{
			provide: ReceivePaymentWebhookUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
				outbox: PgOutboxRepository,
				paymentWorkflow: PaymentWorkflowService,
			) =>
				new ReceivePaymentWebhookUseCase({
					transactions,
					payments,
					outbox,
					paymentWorkflow,
				}),
			inject: [
				PgTransactionManager,
				PgPaymentRepository,
				PgOutboxRepository,
				PaymentWorkflowService,
			],
		},
		{
			provide: ProcessPaymentWebhookUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
				outbox: PgOutboxRepository,
				paymentWorkflow: PaymentWorkflowService,
			) =>
				new ProcessPaymentWebhookUseCase({
					transactions,
					payments,
					outbox,
					paymentWorkflow,
				}),
			inject: [
				PgTransactionManager,
				PgPaymentRepository,
				PgOutboxRepository,
				PaymentWorkflowService,
			],
		},
		{
			provide: ListAdminPaymentOrdersUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
			) =>
				new ListAdminPaymentOrdersUseCase({
					transactions,
					payments,
				}),
			inject: [PgTransactionManager, PgPaymentRepository],
		},
		{
			provide: ListAdminPaymentTransactionsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
			) =>
				new ListAdminPaymentTransactionsUseCase({
					transactions,
					payments,
				}),
			inject: [PgTransactionManager, PgPaymentRepository],
		},
		{
			provide: ListAdminPaymentWebhooksUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				payments: PgPaymentRepository,
			) =>
				new ListAdminPaymentWebhooksUseCase({
					transactions,
					payments,
				}),
			inject: [PgTransactionManager, PgPaymentRepository],
		},
	],
	exports: [
		PaymentWorkflowService,
		PgPaymentRepository,
		CreatePaymentOrderUseCase,
		ReceivePaymentWebhookUseCase,
		ProcessPaymentWebhookUseCase,
		ListAdminPaymentOrdersUseCase,
		ListAdminPaymentTransactionsUseCase,
		ListAdminPaymentWebhooksUseCase,
	],
})
export class PaymentModule {}
