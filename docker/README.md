# Docker Setup for POCOmeta Integration

This directory contains the Docker configuration for running Paperless-ngx with POCOmeta integration.

## Quick Setup

1. **Directory Structure**
   ```
   your-paperless-project/
   ├── docker/
   │   ├── docker-compose.yml
   │   ├── Dockerfile
   │   ├── paperless.env
   │   └── scripts/post_consume/poco_wrapper.sh
   ├── scripts/post_consume/POCOmeta/
   │   ├── main.py
   │   ├── settings.py
   │   ├── rules/
   │   └── ... (all POCOmeta files)
   └── data/
       ├── consume/
       ├── export/
       └── media/
   ```

2. **Environment Setup**
   - Copy `paperless.env.example` to `paperless.env`
   - Update `PAPERLESS_API_TOKEN` with your actual token
   - Adjust POCOmeta settings as needed

3. **POCOmeta Integration**
   - Place POCOmeta files in `scripts/post_consume/POCOmeta/`
   - Create your custom rules in the `rules/` directory
   - Configure tags: NEW → POCO workflow

## Configuration

### Environment Variables (paperless.env)

Key POCOmeta settings:
```bash
# POCOmeta document filtering
FILTER_TAG_INCLUDE=NEW          # Process documents with this tag
FILTER_TAG_EXCLUDE=POCO         # Skip documents already processed
COMPLETION_TAG=POCO             # Tag added after processing

# POCOmeta processing settings
POCO_MAX_DOCUMENTS=0            # 0 = no limit
POCO_DRY_RUN=false             # Set to true for testing
POCO_VERBOSE=false             # Set to true for detailed output
```

### Custom Settings

Create `scripts/post_consume/POCOmeta/settings.py`:
```python
def get_settings():
    return {
        "PAPERLESS_URL": "http://localhost:8000",
        "INCLUDE_TAG": "NEW",
        "EXCLUDE_TAG": "POCO",
        "COMPLETION_TAG": "POCO",
        "MAX_DOCUMENTS": 0,
        "DRY_RUN": False,
        "VERBOSE": False
    }
```

## Deployment

1. **Build and Start**
   ```bash
   cd docker
   docker compose build
   docker compose up -d
   ```

2. **Create Superuser**
   ```bash
   docker compose exec webserver python manage.py createsuperuser
   ```

3. **Test POCOmeta**
   ```bash
   # Test POCOmeta installation
   docker compose exec webserver python3 -m scripts.post_consume.POCOmeta.main --help
   
   # Dry run test
   docker compose exec webserver python3 -m scripts.post_consume.POCOmeta.main --dry-run --limit 1
   ```

## Workflow

1. **Document Upload**: Upload documents to Paperless
2. **Tag Assignment**: Tag new documents with "NEW"
3. **Automatic Processing**: POCOmeta processes documents automatically via post-consumption hook
4. **Result**: Documents get enriched metadata and tagged with "POCO"

## Monitoring

### Log Files
```bash
# POCOmeta processing logs
docker compose exec webserver tail -f /tmp/poco.log

# Paperless logs
docker compose logs -f webserver
```

### Health Checks
```bash
# Check POCOmeta status
docker compose exec webserver python3 -m scripts.post_consume.POCOmeta.main --id-only

# Check processed documents
docker compose exec webserver python manage.py shell -c "
from documents.models import Document, Tag
poco_tag = Tag.objects.get(name='POCO')
print(f'Processed documents: {Document.objects.filter(tags=poco_tag).count()}')
"
```

## Troubleshooting

### Common Issues

1. **Module Import Errors**
   - Ensure POCOmeta directory exists in correct location
   - Check file permissions and ownership

2. **API Connection Errors**
   - Verify `PAPERLESS_API_TOKEN` is correct
   - Check internal URL `http://localhost:8000`

3. **Processing Errors**
   - Check `/tmp/poco.log` for detailed error messages
   - Test with `--dry-run` first

### Debug Mode

Enable detailed debugging:
```bash
# Set in paperless.env
POCO_VERBOSE=true
POCO_DRY_RUN=true

# Restart container
docker compose restart webserver
```

## Migration from AI Setup

If upgrading from a setup with AI components:

1. **Backup Current Data**
   ```bash
   docker compose exec webserver pg_dump paperless > backup.sql
   ```

2. **Update Configuration**
   - Comment out AI services in docker-compose.yml
   - Remove AI environment variables
   - Update post-consumption script path

3. **Clean Up**
   ```bash
   # Remove AI containers and volumes
   docker compose down
   docker volume prune
   ```

## Security

- Keep `PAPERLESS_API_TOKEN` secure
- Use Docker secrets for production deployments
- Limit network access if needed
- Regular backups of data and configuration

## Customization

### Adding New Rules
1. Create YAML files in `scripts/post_consume/POCOmeta/rules/`
2. Test with `--dry-run --verbose`
3. Monitor processing logs

### Custom Post-Processing
Modify `poco_wrapper.sh` to add custom logic before/after POCOmeta execution.

This setup provides a clean, maintainable integration that can be easily adapted for public distribution.