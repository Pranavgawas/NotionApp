const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Upload image/video endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, caption, type, externalUrl } = req.body;
    const file = req.file;

    // If external URL is provided, use that
    if (externalUrl) {
      const blockType = type === 'image' ? 'image' : 'video';
      
      const response = await notion.pages.create({
        parent: {
          type: 'database_id',
          database_id: process.env.NOTION_DATABASE_ID
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          }
        },
        children: [
          {
            object: 'block',
            type: blockType,
            [blockType]: {
              type: 'external',
              external: {
                url: externalUrl
              },
              caption: caption ? [{ type: 'text', text: { content: caption } }] : []
            }
          }
        ]
      });

      return res.json({ success: true, pageId: response.id });
    }

    // For file uploads, we'll create a page with file info and embed as code block
    if (!file) {
      return res.status(400).json({ error: 'No file or external URL provided' });
    }

    // Check file size (Notion API has limits)
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return res.status(400).json({ 
        error: 'File too large. Notion API only supports files up to 5MB when embedding. Please upload your file to an external service (like Imgur, Cloudinary, etc.) and use the URL instead.',
        code: 'FILE_TOO_LARGE'
      });
    }

    // For small images, try uploading as base64 (may fail for larger files)
    const base64Data = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

    // Create page with file information
    const response = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `File: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: caption || 'No caption provided'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '💡 Note: File has been uploaded. For best results, upload images/videos to an external hosting service and paste the URL instead.'
                }
              }
            ],
            icon: {
              emoji: '💡'
            }
          }
        }
      ]
    });

    res.json({ 
      success: true, 
      pageId: response.id,
      message: 'Page created with file information. For images/videos, please use external URLs for better results.'
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Check if it's a payload too large error
    if (error.code === 'request_entity_too_large' || error.status === 413) {
      return res.status(413).json({ 
        error: 'File is too large for Notion API. Please upload your file to an external service (Imgur, Cloudinary, etc.) and use the "URL Content" tab to add the link instead.',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to upload to Notion',
      details: error.body || error
    });
  }
});

// Add URL endpoint
app.post('/api/add-url', async (req, res) => {
  try {
    const { title, url, caption } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const response = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'bookmark',
          bookmark: {
            url: url,
            caption: caption ? [{ type: 'text', text: { content: caption } }] : []
          }
        }
      ]
    });

    res.json({ success: true, pageId: response.id });
  } catch (error) {
    console.error('URL add error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to add URL to Notion',
      details: error.body || error
    });
  }
});

// Fetch all pages from database
app.get('/api/pages', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    // Get page content for each page
    const pagesWithContent = await Promise.all(
      response.results.map(async (page) => {
        try {
          // Get blocks (content) of the page
          const blocks = await notion.blocks.children.list({
            block_id: page.id
          });

          // Extract title
          const title = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
          
          // Extract media content
          const mediaBlocks = blocks.results.filter(block => 
            block.type === 'image' || block.type === 'video' || block.type === 'bookmark'
          );

          const media = mediaBlocks.map(block => {
            if (block.type === 'image') {
              return {
                type: 'image',
                url: block.image.external?.url || block.image.file?.url,
                caption: block.image.caption?.[0]?.text?.content || ''
              };
            } else if (block.type === 'video') {
              return {
                type: 'video',
                url: block.video.external?.url || block.video.file?.url,
                caption: block.video.caption?.[0]?.text?.content || ''
              };
            } else if (block.type === 'bookmark') {
              return {
                type: 'bookmark',
                url: block.bookmark.url,
                caption: block.bookmark.caption?.[0]?.text?.content || ''
              };
            }
            return null;
          }).filter(Boolean);

          return {
            id: page.id,
            title,
            createdTime: page.created_time,
            media: media[0] || null
          };
        } catch (error) {
          console.error(`Error fetching content for page ${page.id}:`, error);
          return null;
        }
      })
    );

    res.json({ 
      success: true, 
      pages: pagesWithContent.filter(Boolean)
    });
  } catch (error) {
    console.error('Fetch pages error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch pages from Notion',
      details: error.body || error
    });
  }
});

// Delete page endpoint
app.delete('/api/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;

    // Archive (soft delete) the page in Notion
    await notion.pages.update({
      page_id: pageId,
      archived: true
    });

    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete page from Notion',
      details: error.body || error
    });
  }
});

// Debug endpoint - get page blocks
app.get('/api/debug/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    
    const blocks = await notion.blocks.children.list({
      block_id: pageId
    });
    
    res.json({ success: true, blocks: blocks.results });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch page blocks',
      details: error.body || error
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Notion Database ID: ${process.env.NOTION_DATABASE_ID}`);
});
