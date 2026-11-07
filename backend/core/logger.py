import logging
import queue
from logging.handlers import QueueHandler, QueueListener
import axiom_py
from axiom_py.logging import AxiomHandler
from core.config import settings

logger = logging.getLogger("raccon")
logger.setLevel(logging.INFO)

if settings.AXIOM_TOKEN and settings.AXIOM_DATASET:
    client = axiom_py.Client(token=settings.AXIOM_TOKEN)
    axiom_handler = AxiomHandler(client, settings.AXIOM_DATASET)
    log_queue = queue.Queue(-1)
    queue_handler = QueueHandler(log_queue)
    listener = QueueListener(log_queue, axiom_handler)
    listener.start()
    logger.addHandler(queue_handler)
else:
    console_handler = logging.StreamHandler()
    logger.addHandler(console_handler)